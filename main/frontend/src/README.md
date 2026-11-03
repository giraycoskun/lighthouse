# Local web application

The React/Vite/TypeScript dashboard consumes the backend readiness, status, and application endpoints. It displays API health, SQLite readiness, backend version, process uptime, runtime timestamps, and registered application reachability. The add-application page accepts a Docker or systemd runtime and at least one internal or external HTTP(S) address. Swagger UI remains linked from the footer.

## Run locally

Start the Go backend first, then run:

```sh
npm install
npm run dev
```

Vite serves the dashboard at `http://localhost:5173` and proxies `/api`, `/docs`, and `/openapi.yaml` to the backend at `http://127.0.0.1:8080`.

Verify with:

```sh
npm run typecheck
npm test
npm run build
```

Use the same-origin Go API, not the host helper directly. Production same-origin asset serving will be added with the container deployment. Never ship service credentials in browser code. Show unavailable states rather than inventing healthy readings.

Planned modules: authenticated host metrics, command status/confirmation, session handling, and optional chat. Tests are co-located with their implementations. See [milestones](../../../docs/BUILD_PLAN.md).
