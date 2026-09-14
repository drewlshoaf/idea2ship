import os

from fastapi.testclient import TestClient


os.environ["FORGE_DATABASE_URL"] = "sqlite:///./test-forge.db"
os.environ["FORGE_AGENT_PROVIDER"] = "deterministic"

from app import config  # noqa: E402

config.get_settings.cache_clear()
from app.main import app  # noqa: E402


def create_project(client: TestClient) -> dict:
    response = client.post(
        "/api/projects",
        json={
            "name": "SignalDesk",
            "idea": "Help instructors identify students who need support before the course midpoint.",
            "project_type": "AI product",
            "goal": "Production plan",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_strategist_approval_flow() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        project = create_project(client)

        run_response = client.post(f"/api/projects/{project['id']}/runs")
        assert run_response.status_code == 202
        run = run_response.json()

        run_state = client.get(f"/api/runs/{run['id']}").json()
        assert run_state["status"] == "waiting_for_approval"

        event_stream = client.get(f"/api/runs/{run['id']}/events")
        assert event_stream.status_code == 200
        assert "event: workflow.started" in event_stream.text
        assert "event: approval.requested" in event_stream.text

        artifacts = client.get(f"/api/projects/{project['id']}/artifacts").json()
        assert len(artifacts) == 1
        assert artifacts[0]["status"] == "awaiting_approval"
        assert artifacts[0]["versions"][0]["content"]["mvp_features"]

        approval = client.post(f"/api/artifacts/{artifacts[0]['id']}/approve")
        assert approval.status_code == 200
        assert approval.json()["action"] == "approve"
        assert client.get(f"/api/runs/{run['id']}").json()["status"] == "complete"


def test_revision_creates_a_new_artifact_version() -> None:
    with TestClient(app) as client:
        project = create_project(client)
        run = client.post(f"/api/projects/{project['id']}/runs").json()
        artifact = client.get(f"/api/projects/{project['id']}/artifacts").json()[0]

        response = client.post(
            f"/api/artifacts/{artifact['id']}/revise",
            json={"instructions": "Focus the first release exclusively on course instructors."},
        )
        assert response.status_code == 202

        revised = client.get(f"/api/projects/{project['id']}/artifacts").json()[0]
        assert revised["current_version"] == 2
        assert len(revised["versions"]) == 2
        assert revised["status"] == "awaiting_approval"
