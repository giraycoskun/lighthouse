# Lighthouse

A home-server dashboard with a Go backend and an independent Cloudflare status/recovery board. Initial scope: **one Ubuntu server, one administrator**. The main app runs in Docker; `cloudflared` runs under host systemd. Ollama and MCP are deferred.

## Status

**Early implementation.** A minimal Go backend provides SQLite initialization, health/status endpoints, an OpenAPI contract, and Swagger UI. A React dashboard consumes those operational endpoints and handles unavailable states. Authentication, host integration, cloud sync, command execution, container deployment, deployed Worker, and model integration are not implemented. M0 networking feasibility has not been demonstrated.

## Start here

1. Read [the architecture decisions](docs/ARCHITECTURE.md) and [build plan](docs/BUILD_PLAN.md) for the agreed stack and milestones.
2. Follow [the verification plan](docs/VERIFICATION.md) for acceptance criteria and the safe tunnel-down runbook.
3. Implement **M0 first**: from the intended main container, upload fresh status and retrieve a queued restart command while the tunnel is stopped and outbound internet still works. This first test must **not execute** the command; retain an independent recovery console.

Then build: **local dashboard → protected board and sync → confirmed tunnel restart → optional chat**.

## Agreed stack

- **Main:** React/Vite/TypeScript frontend, Go `net/http` backend and SQLite. Go serves the built frontend and API in one Docker container.
- **Cloudflare:** static React/Vite/TypeScript board on Pages; an optional same-origin TypeScript Worker API and D1 provide live data and commands when enabled.
- **Authentication:** local administrator login for the main app; Cloudflare Access for the cloud board; separate scoped credentials for server sync.
- **Host integration:** small Go helper installed as an Ubuntu systemd service, exposing host metrics and a fixed `cloudflared` restart over a restricted Unix socket.
- **Tooling:** each frontend and Worker owns its JavaScript manifest; the main backend and host helper will share one Go module. No shared runtime package or separate MCP service initially.

The backend and both frontend foundations use pinned Go, Node/npm, and library versions. Deployment, authentication, host integration, sync, and command choices remain planned. Node is frontend/Worker tooling, not the main backend runtime. Development on macOS does not verify Ubuntu host metrics or systemd permissions.

## Project structure

```text
main/
  frontend/src/              React dashboard
  backend/                   Runnable Go API and SQLite foundation
    host-helper/             Host helper boundary notes (same Go module)
  deploy/
    docker/                  Main container and persistent data
    host/                    Ubuntu helper/systemd setup
  tests/                     Main and cross-project acceptance scenarios
board/
  frontend/src/              Static status/recovery board
  worker/
    src/                     Authenticated APIs and scheduled cleanup
    migrations/              D1 migrations
  deploy/                    Pages, Access, optional Worker and D1 notes
  tests/                     Worker/D1 and board browser scenarios
docs/
  ARCHITECTURE.md             Agreed decisions and remaining deployment inputs
  BUILD_PLAN.md               Milestones and implementation rules
  VERIFICATION.md             Acceptance criteria and recovery runbook
```

The two projects own their deployment, JavaScript tooling and tests and will communicate over authenticated HTTPS. Both React frontends have pinned dependencies, lockfiles, build scripts, and focused tests; the Worker remains a planning scaffold. The Go backend module and its focused tests are initialized. Deployment commands and functional acceptance suites remain future work. No milestone acceptance gate has passed yet.

## Non-negotiable boundaries

- The main component initiates outbound HTTPS to the board; sync must not depend on the home tunnel or Ollama.
- Separate Worker-admin credentials, scoped server-sync token and executor authorization. Never put secrets in static builds or logs.
- Only read-only diagnostics and explicitly confirmed `restart_tunnel` are in scope. No arbitrary shell, broad updates, deletion, reboot or network configuration changes.
- No privileged application container or application access to the Docker socket. The executor has a fixed deployment-configured target, not a model-supplied command.
- Commands have IDs, expiry, durable deduplication and verified outcomes. Uncertain crash outcomes require inspection, not automatic replay.
- Sync at startup, hourly and after actions. The board retains status/command history for ten days and clearly labels missing hourly samples **unknown/unreachable**, not confirmed downtime.

Later: natural-language board requests, additional maintenance actions and weekly security checks. Those are outside the initial build.
