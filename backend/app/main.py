import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, List

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .config import get_settings
from .database import create_schema, get_db
from .models import Approval, Artifact, Project, WorkflowEvent, WorkflowRun
from .schemas import ApprovalRead, ArtifactRead, HealthRead, ProjectCreate, ProjectRead, RevisionRequest, RunRead
from .workflow import append_event, run_product_strategist


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_schema()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthRead)
def health() -> HealthRead:
    return HealthRead(status="ok", database=settings.database_url.split(":", 1)[0], agent_provider=settings.agent_provider)


@app.post("/api/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> Project:
    project = Project(
        name=payload.name,
        idea=payload.idea,
        project_type=payload.project_type,
        goal=payload.goal,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/api/projects", response_model=List[ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> List[Project]:
    return list(db.scalars(select(Project).order_by(Project.created_at.desc())))


@app.get("/api/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.post("/api/projects/{project_id}/runs", response_model=RunRead, status_code=status.HTTP_202_ACCEPTED)
def start_run(project_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> WorkflowRun:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    active = db.scalar(
        select(WorkflowRun).where(
            WorkflowRun.project_id == project_id,
            WorkflowRun.status.in_(["pending", "running", "waiting_for_approval"]),
        )
    )
    if active:
        raise HTTPException(status_code=409, detail="This project already has an active run")
    run = WorkflowRun(project_id=project_id, status="pending")
    db.add(run)
    db.flush()
    append_event(db, run.id, "workflow.started", {"project_id": project_id})
    project.status = "running"
    project.readiness = 5
    db.commit()
    db.refresh(run)
    background_tasks.add_task(run_product_strategist, run.id)
    return run


@app.get("/api/runs/{run_id}", response_model=RunRead)
def get_run(run_id: str, db: Session = Depends(get_db)) -> WorkflowRun:
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.get("/api/projects/{project_id}/artifacts", response_model=List[ArtifactRead])
def list_artifacts(project_id: str, db: Session = Depends(get_db)) -> List[Artifact]:
    if not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    statement = select(Artifact).options(selectinload(Artifact.versions)).where(Artifact.project_id == project_id).order_by(Artifact.created_at.desc())
    return list(db.scalars(statement).unique())


def load_artifact(db: Session, artifact_id: str) -> Artifact:
    artifact = db.scalar(select(Artifact).options(selectinload(Artifact.versions)).where(Artifact.id == artifact_id))
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return artifact


@app.post("/api/artifacts/{artifact_id}/approve", response_model=ApprovalRead)
def approve_artifact(artifact_id: str, db: Session = Depends(get_db)) -> Approval:
    artifact = load_artifact(db, artifact_id)
    if artifact.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Artifact is not awaiting approval")
    artifact.status = "approved"
    approval = Approval(artifact_id=artifact.id, artifact_version=artifact.current_version, action="approve")
    db.add(approval)
    run = db.get(WorkflowRun, artifact.run_id)
    project = db.get(Project, artifact.project_id)
    run.status = "complete"
    run.completed_at = utcnow()
    project.status = "active"
    project.readiness = 25
    append_event(db, run.id, "approval.completed", {"artifact_id": artifact.id, "action": "approve"})
    append_event(db, run.id, "workflow.completed", {"scope": "product_strategist"})
    db.commit()
    db.refresh(approval)
    return approval


@app.post("/api/artifacts/{artifact_id}/reject", response_model=ApprovalRead)
def reject_artifact(artifact_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> Approval:
    artifact = load_artifact(db, artifact_id)
    if artifact.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Artifact is not awaiting approval")
    artifact.status = "revision_requested"
    approval = Approval(artifact_id=artifact.id, artifact_version=artifact.current_version, action="reject")
    db.add(approval)
    run = db.get(WorkflowRun, artifact.run_id)
    project = db.get(Project, artifact.project_id)
    run.status = "running"
    run.current_agent = "product_strategist"
    project.status = "running"
    append_event(db, run.id, "approval.completed", {"artifact_id": artifact.id, "action": "reject"})
    append_event(db, run.id, "agent.started", {"agent": "product_strategist", "reason": "regenerate"})
    db.commit()
    db.refresh(approval)
    background_tasks.add_task(run_product_strategist, run.id, artifact.id, "Regenerate the brief from the original idea with a different framing.")
    return approval


@app.post("/api/artifacts/{artifact_id}/revise", response_model=ApprovalRead, status_code=status.HTTP_202_ACCEPTED)
def revise_artifact(artifact_id: str, payload: RevisionRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> Approval:
    artifact = load_artifact(db, artifact_id)
    if artifact.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Artifact is not awaiting approval")
    artifact.status = "revision_requested"
    approval = Approval(artifact_id=artifact.id, artifact_version=artifact.current_version, action="revise", instructions=payload.instructions)
    db.add(approval)
    run = db.get(WorkflowRun, artifact.run_id)
    project = db.get(Project, artifact.project_id)
    run.status = "running"
    run.current_agent = "product_strategist"
    project.status = "running"
    append_event(db, run.id, "approval.completed", {"artifact_id": artifact.id, "action": "revise"})
    append_event(db, run.id, "agent.started", {"agent": "product_strategist", "reason": "revision"})
    db.commit()
    db.refresh(approval)
    background_tasks.add_task(run_product_strategist, run.id, artifact.id, payload.instructions)
    return approval


@app.get("/api/runs/{run_id}/events")
async def stream_events(run_id: str, after: int = Query(default=0, ge=0)) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        cursor = after
        idle_ticks = 0
        while True:
            from .database import SessionLocal

            with SessionLocal() as db:
                if not db.get(WorkflowRun, run_id):
                    yield "event: error\ndata: {\"message\":\"Run not found\"}\n\n"
                    return
                events = list(db.scalars(select(WorkflowEvent).where(WorkflowEvent.run_id == run_id, WorkflowEvent.sequence > cursor).order_by(WorkflowEvent.sequence)))
                run = db.get(WorkflowRun, run_id)
            if events:
                idle_ticks = 0
                for event in events:
                    cursor = event.sequence
                    data = json.dumps({"id": event.id, "sequence": event.sequence, "type": event.event_type, "payload": event.payload, "created_at": event.created_at.isoformat()})
                    yield f"id: {event.sequence}\nevent: {event.event_type}\ndata: {data}\n\n"
            else:
                idle_ticks += 1
                yield ": keep-alive\n\n"
            if run.status in {"complete", "failed", "rejected", "waiting_for_approval"} and idle_ticks >= 2:
                return
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
