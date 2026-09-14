# Forge

Forge is an agentic product studio that turns a rough product idea into a structured, implementation-ready package. Its control-room interface makes orchestration, tool use, artifact generation, and human approval visible instead of hiding them behind a chat box.

## Live demo

[Open the private Forge demo](https://forge-product-studio.drewlshoaf.chatgpt.site)

The current release is a stateful portfolio prototype. Projects created in the demo are stored on the current device. The Strategist workflow is deterministic until the agent backend is connected.

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

The repository contains a dependency-free static web application:

- `dist/index.html` — application shell and seeded workspace
- `dist/styles.css` — responsive visual system and component styling
- `dist/app.js` — navigation, project state, workflow simulation, and review interactions
- `.openai/hosting.json` — Sites deployment configuration

## Next build milestones

1. Add a FastAPI service and PostgreSQL persistence.
2. Replace deterministic generation with a structured Product Strategist agent.
3. Store artifacts, versions, approvals, agent runs, and workflow events.
4. Add Research, UX, Architecture, and Engineering workflow nodes.
5. Connect MCP servers and retain sources for every research claim.
6. Stream live events to the interface with Server-Sent Events.
7. Add authentication, permission policies, retries, tests, and observability.

## Run locally

Serve the `dist` directory with any static file server, then open the printed local address in a browser.

For example:

```bash
python3 -m http.server 4174 --directory dist
```

## Status

The interface and first stateful vertical slice are implemented. Live LLM execution, shared persistence, and production integrations remain planned work.
