# Go backend

The first runnable backend slice uses Go 1.27, standard-library `net/http`, and a pure-Go SQLite driver. It provides liveness, readiness, service status, an OpenAPI 3.1 contract, and an embedded Swagger UI. Authentication, host metrics, cloud synchronization, command handling, and frontend serving remain later milestones.

The implemented entrypoint is `cmd/lighthouse`. The planned `cmd/host-helper` will remain a separate binary in this module and will be installed on the host rather than run inside the application container.

## Run locally

```sh
go run ./cmd/lighthouse
```

The service listens on `:8080` by default. Open Swagger UI at `http://localhost:8080/docs/` or fetch the source contract from `http://localhost:8080/openapi.yaml`.

Configuration:

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `LIGHTHOUSE_ADDRESS` | `:8080` | HTTP listen address |
| `LIGHTHOUSE_DATABASE_PATH` | `data/lighthouse.db` | SQLite database location |
| `LIGHTHOUSE_SHUTDOWN_TIMEOUT` | `10s` | Graceful-shutdown deadline |

Run verification with:

```sh
go test ./...
go vet ./...
```

SQLite initialization and versioned migrations are implemented as the persistence foundation. Later migrations will add administrator/session state, the retry outbox, and action ledgers. Persist intent before dispatch; retry result uploads without re-executing commands. Manual and cloud-board actions converge on the same command path.

Use a local administrator login with hashed credentials and secure cookie sessions, independently of Cloudflare. Outbound HTTPS publishes startup/hourly/after-action telemetry and retrieves commands using a scoped sync token. The M0 spike has no host-helper access. Sync and manual operations remain independent of Ollama; MCP and chat come later.

Collect host metrics through the host helper, distinguishing them from container metrics. Go packages use native tests alongside source; project integration and browser scenarios live in `../tests/`. See [the build plan](../../docs/BUILD_PLAN.md).
