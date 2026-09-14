# Forge

Forge is an agentic product studio that turns a rough product idea into a structured, implementation-ready package. Its control-room interface makes orchestration, tool use, artifact generation, and human approval visible instead of hiding them behind a chat box.

## Live demo

[Open the private Forge demo](https://forge-product-studio.drewlshoaf.chatgpt.site)

The published interface is a stateful portfolio prototype. The repository now also includes the first real API vertical slice: persisted projects, Strategist runs, versioned artifacts, approval decisions, and an SSE event stream.

## What works

- Create a project from a short product idea
- Review and approve a five-agent execution plan
- Watch the Product Strategist produce a structured brief
- Approve, revise, or reject the generated artifact
- Preserve created projects across browser refreshes
- Explore the seeded agent workspace, MCP trace, architecture canvas, and engineering backlog
- Use the interface across desktop and mobile layouts

## Product model

```text
Idea
  ↓
Execution plan
  ↓
Product Strategist ── approval gate
  ↓
Research Agent ────── approval gate
  ↓
UX Designer ───────── approval gate
  ↓
Solution Architect ── approval gate
  ↓
Engineering Planner
  ↓
Implementation-ready package
```

## Current architecture

The repository contains a dependency-free static web application and a FastAPI service:

- `dist/index.html` — application shell and seeded workspace
- `dist/styles.css` — responsive visual system and component styling
- `dist/app.js` — navigation, project state, workflow simulation, and review interactions
- `backend/app/main.py` — project, run, artifact, approval, and event APIs
- `backend/app/workflow.py` — asynchronous Product Strategist workflow
- `backend/app/agent.py` — deterministic and OpenAI-backed Strategist providers
- `backend/app/models.py` — SQLAlchemy persistence model
- `.openai/hosting.json` — Sites deployment configuration

The API uses SQLite by default for zero-configuration local development and supports PostgreSQL through `FORGE_DATABASE_URL`. The deterministic provider makes the full workflow testable without credentials. Set `FORGE_AGENT_PROVIDER=openai` and supply `FORGE_OPENAI_API_KEY` to use the Responses API with a strict product-brief schema.

## Next build milestones

1. Connect the published interface to the API.
2. Add Research, UX, Architecture, and Engineering workflow nodes.
3. Connect MCP servers and retain sources for every research claim.
4. Add authentication, permission policies, retries, and observability.
5. Move schema creation to managed database migrations.

## Run locally

Serve the `dist` directory with any static file server, then open the printed local address in a browser.

For example:

```bash
python3 -m http.server 4174 --directory dist
```

Run the backend in a second terminal:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload
```

Or start PostgreSQL and the API together:

```bash
docker compose up --build
```

## Status

The interface and first backend vertical slice are implemented. The OpenAI provider follows the current Responses API structured-output pattern documented in the [official OpenAI API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).
