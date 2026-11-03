<h1 align="center">🗼 Lighthouse</h1>

<p align="center"><strong>A focused control plane for self-hosted applications.</strong></p>

<p align="center">
  <img alt="Go API" src="https://img.shields.io/badge/Go-API-00ADD8?logo=go&amp;logoColor=white">
  <img alt="React dashboard" src="https://img.shields.io/badge/React-dashboard-149ECA?logo=react&amp;logoColor=white">
  <img alt="SQLite storage" src="https://img.shields.io/badge/SQLite-storage-003B57?logo=sqlite&amp;logoColor=white">
  <img alt="Cloudflare recovery" src="https://img.shields.io/badge/Cloudflare-recovery-F38020?logo=cloudflare&amp;logoColor=white">
</p>

Lighthouse monitors Docker and systemd applications from their internal or external addresses, with a local dashboard and an independent Cloudflare recovery board.

> 🚧 **Early MVP** — monitoring and the local API are implemented; authentication, host actions, and cloud synchronization are planned.

```mermaid
flowchart LR
    A[⚛️ React dashboard] --> B[🐹 Go API]
    B --> C[(🗃️ SQLite)]
    B --> D[📦 Docker apps]
    B --> E[⚙️ systemd services]
    B -. planned sync .-> F[☁️ Cloudflare board]
```

## ✨ Included

- Application registration and reachability status
- Internal and external HTTP(S) checks
- SQLite persistence, OpenAPI contract, and Swagger UI
- Responsive local dashboard and static recovery board

## 🚀 Run locally

```bash
# terminal 1
cd main/backend && go run ./cmd/lighthouse

# terminal 2
cd main/frontend && npm install && npm run dev
```

Open **http://localhost:5173** · API docs: **http://localhost:8080/docs/**

## 🧭 Explore

[Architecture](docs/ARCHITECTURE.md) · [Build plan](docs/BUILD_PLAN.md) · [Verification](docs/VERIFICATION.md)
