import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from .agent import get_strategist
from .config import get_settings
from .database import SessionLocal
from .models import Artifact, ArtifactVersion, Project, WorkflowEvent, WorkflowRun
from .schemas import ProjectRead


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def append_event(db, run_id: str, event_type: str, payload: Optional[dict] = None) -> WorkflowEvent:
    next_sequence = db.scalar(select(func.coalesce(func.max(WorkflowEvent.sequence), 0) + 1).where(WorkflowEvent.run_id == run_id))
    event = WorkflowEvent(run_id=run_id, sequence=next_sequence, event_type=event_type, payload=payload or {})
    db.add(event)
    db.flush()
    return event


async def run_product_strategist(
    run_id: str,
    artifact_id: Optional[str] = None,
    revision_instructions: Optional[str] = None,
) -> None:
    settings = get_settings()
    try:
        with SessionLocal() as db:
            run = db.get(WorkflowRun, run_id)
            if not run:
                return
            project = db.get(Project, run.project_id)
            run.status = "running"
            run.current_agent = "product_strategist"
            run.started_at = run.started_at or utcnow()
            project.status = "running"
            append_event(db, run.id, "agent.started", {"agent": "product_strategist"})
            db.commit()
            project_data = ProjectRead.model_validate(project)

        if settings.agent_provider == "deterministic":
            await asyncio.sleep(0.15)
        brief = await get_strategist(settings).generate(project_data, revision_instructions)

        with SessionLocal() as db:
            run = db.get(WorkflowRun, run_id)
            project = db.get(Project, run.project_id)
            artifact = db.scalar(
                select(Artifact)
                .options(selectinload(Artifact.versions))
                .where(Artifact.id == artifact_id)
            ) if artifact_id else None
            if artifact is None:
                artifact = Artifact(
                    project_id=project.id,
                    run_id=run.id,
                    artifact_type="PRODUCT_BRIEF",
                    title="Product brief",
                    status="awaiting_approval",
                    current_version=1,
                )
                db.add(artifact)
                db.flush()
                version_number = 1
            else:
                version_number = artifact.current_version + 1
                artifact.current_version = version_number
                artifact.status = "awaiting_approval"

            version = ArtifactVersion(
                artifact_id=artifact.id,
                version=version_number,
                content=brief.model_dump(mode="json"),
                revision_instructions=revision_instructions,
            )
            db.add(version)
            run.status = "waiting_for_approval"
            run.current_agent = None
            project.status = "waiting_for_approval"
            project.readiness = 20
            append_event(db, run.id, "agent.completed", {"agent": "product_strategist"})
            append_event(db, run.id, "artifact.created" if version_number == 1 else "artifact.revised", {"artifact_id": artifact.id, "version": version_number})
            append_event(db, run.id, "approval.requested", {"artifact_id": artifact.id, "version": version_number})
            db.commit()
    except Exception as exc:
        with SessionLocal() as db:
            run = db.get(WorkflowRun, run_id)
            if run:
                run.status = "failed"
                run.error = str(exc)[:2000]
                run.completed_at = utcnow()
                project = db.get(Project, run.project_id)
                if project:
                    project.status = "failed"
                append_event(db, run.id, "workflow.failed", {"message": "The Strategist could not complete this run."})
                db.commit()
