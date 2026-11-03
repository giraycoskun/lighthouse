# Architecture decisions

## Agreed with the project owner

| Area | Decision |
| --- | --- |
| Scope | One Ubuntu host and one administrator; dashboard, status sync and manually confirmed tunnel restart first |
| Project boundaries | `main/` and `board/`, independently deployable with their own deployment files and tests |
| Frontends | React + Vite + TypeScript for both |
| Main backend | One Go application using standard-library `net/http`; internal modules for auth, metrics, sync, commands and persistence |
| Main deployment | One Docker container; Go serves the compiled frontend and JSON API on the same origin |
| Local persistence | SQLite on a persistent Docker volume; migrations owned by the backend |
| Cloud hosting | Cloudflare Pages for the static board; same-origin TypeScript Worker APIs and D1 only for live state and commands |
| Administrator auth | Local administrator login for the main app; Cloudflare Access for the cloud board |
| Machine auth | Separate scoped server-sync token; separate restricted helper access |
| Host integration | `cloudflared` is managed by Ubuntu systemd; a small Go helper runs on the host under systemd |
| Helper interface | Permission-restricted Unix socket; read-only host metrics and a fixed tunnel restart only |
| API communication | JSON over HTTPS; validate contracts in Go and TypeScript, without a shared runtime package |
| AI | Ollama and MCP deferred until manual workflows work |

## Runtime layout

```text
Ubuntu host
  Docker: Go API + built React UI + SQLite volume
    | restricted Unix socket
  Go host helper (systemd) + host-side SQLite execution ledger
    | host metrics / fixed restart
  cloudflared (systemd)

  Go API -- outbound HTTPS --> optional Cloudflare Worker + D1
                              Cloudflare Pages: static React board
                              administrator: Cloudflare Access
```

Cloud sync does not use the home tunnel. Local login and diagnostics remain usable when the internet or Cloudflare is unavailable. The host helper is part of the main project's Go module, with a separate binary and deployment because it needs host-local access. It owns its own durable execution records, so recreating the application container cannot erase restart outcomes.

The main image uses Node only during the frontend build. Development runs Vite with an API proxy to Go; production serves both from Go. The board project uses one Wrangler configuration at `board/wrangler.jsonc` once implemented. Each JavaScript component owns its tooling so the two projects can build and deploy independently.

Cloudflare Access protects the board and admin APIs. The Worker validates Access JWT signature, issuer, audience, expiry and the authorized identity. Machine sync has a dedicated route that does not require interactive Access login; the Worker still requires its scoped token. Browser mutations require Origin/CSRF validation and action-specific confirmation. The local app maintains its own hashed administrator credentials and cookie sessions.

## Details to resolve during implementation/setup

- Supported/pinned Go, Node, pnpm and library versions; SQLite driver, frontend styling and local password/session implementation.
- Ubuntu version and CPU architecture, exact `cloudflared` unit name, tunnel health probe and independent recovery connection.
- Host-helper systemd permissions, socket UID/GID mapping and persistent paths; do not infer the unit name from the product name.
- Local HTTPS termination and access URL; Cloudflare account/domain, Access identity provider/allowed identity and Worker audience/issuer.
- Command pickup cadence, TTL and lease/timeouts. Hourly telemetry remains the baseline; choose command latency separately.
- Schema details, backups/restores, credential provisioning and rotation, retention cleanup timing and resource limits.

The minimal Go backend module now exists with SQLite initialization and documented operational endpoints. A React dashboard consumes its readiness and status contract during development through a Vite proxy. There is still no production asset integration, deployment configuration, deployed board, host helper, authentication, or full product workflow. M0 in [the build plan](BUILD_PLAN.md) remains an unpassed deployment gate before broader application work.
