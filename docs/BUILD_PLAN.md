# Lighthouse build plan

## Scope and current state

This remains primarily an implementation plan for one home server and one administrator. A runnable backend foundation supplies SQLite migrations, operational endpoints, OpenAPI documentation, Swagger UI, and focused Go tests. A minimal React dashboard consumes the current status contract with responsive loading, healthy, and unavailable states. Authentication, host metrics, host integration, cloud sync, commands, and deployable infrastructure are not implemented. These foundations do not prove any deployment milestone.

Agreed stack: React/Vite/TypeScript frontends; one Go `net/http` backend with SQLite; one main Docker container on Ubuntu; Cloudflare Pages for the static board, with TypeScript Worker APIs and D1 added for live data and commands. Local administrator login and Cloudflare Access serve the two independent deployments. Node/npm are JavaScript tooling only. Pin supported versions during implementation. See [architecture decisions](ARCHITECTURE.md).

## Architecture and trust boundaries

- **Home server:** one Docker container on Ubuntu, running Go with the built React frontend and SQLite on a persistent volume. Local dashboard shows host disk, memory, CPU, uptime, actual tunnel health, telemetry freshness and command state. Container resource metrics are separately labeled, never substituted for host metrics. MCP and Ollama are deferred.
- **Independent board:** static React frontend served by Cloudflare Pages, with authenticated TypeScript APIs and D1 storage added when live workflows are enabled. Cloudflare Access protects administrator access. It remains reachable without the home tunnel. Static assets contain no secrets or private status data; protected APIs supply data after authentication.
- **Outbound agent:** the local backend uses outbound HTTPS to publish startup, hourly and after-action status and retrieve permitted commands. No inbound tunnel is required for these operations. Hourly polling implies up to roughly one hour of command pickup delay; choose a separate bounded polling cadence only after documenting cost, expiry and latency requirements.
- **Restricted host executor:** a small Go helper installed on Ubuntu as a systemd service, with a permission-restricted Unix socket mounted into the main container. It exposes read-only host diagnostics and one mutating capability, `restart_tunnel`, for the fixed host `cloudflared` unit. No arbitrary shell, user-selected commands, service names or paths; no Docker or host systemd control socket mounted into application containers. Confirm and configure the exact unit and health probe during deployment. The helper uses a separate durable host-side SQLite ledger.
- **Ollama:** optional local natural-language interface using structured allowlisted tools. Exact model and hardware benchmark are deferred. Model output is untrusted and cannot authorize operations. All manual dashboard, board and recovery operations work with Ollama absent.

The board stores commands and status, not host-control credentials. Local/SSH recovery is independent of the board, local app and tunnel. A shell used manually by the administrator for recovery is not an application capability.

## Project structure

These paths express intended ownership, not existing implementations:

```text
main/
  frontend/src/            # React/Vite dashboard
  backend/                 # Go API, SQLite, sync and commands; one Go module
    host-helper/           # Boundary notes for the host-side Go binary
  deploy/docker/           # Single application container and persistent volume
  deploy/host/             # Ubuntu systemd helper and socket permissions
  tests/integration/       # Main and cross-project contract tests
  tests/e2e/               # Local UI and cross-project recovery scenarios
board/
  frontend/src/            # Independent static React board
  worker/src/              # TypeScript APIs and scheduled cleanup
  worker/migrations/       # Versioned D1 schema
  deploy/                  # Pages, Access, optional Worker and D1 notes
  tests/                   # Worker/D1 and board UI tests
docs/
  ARCHITECTURE.md
  BUILD_PLAN.md
  VERIFICATION.md
```

No operational commands are implied by these names. The backend will have `cmd/lighthouse` and `cmd/host-helper` entrypoints in the same Go module. Use JSON-over-HTTPS contracts validated in both languages; avoid shared runtime packages.

## Data and security contracts

### Credentials and administrator authorization

- Local authentication uses hashed administrator credentials and server-managed cookie sessions. Cloud authentication uses Cloudflare Access; the Worker validates JWT signature, issuer, audience, expiry and authorized administrator identity, including requests through alternate hostnames. Keep the scoped per-server sync token separate from administrator auth and executor authorization. Keep secrets out of static bundles, model context, JavaScript-accessible browser storage, URLs and logs; provision, rotate and revoke them independently.
- Give machine sync a dedicated route without interactive Access login, requiring the scoped sync token in the Worker. It cannot invoke administrator handlers. Test both deployed Access policy and application authorization.
- Administrator: view private telemetry/history, enqueue a confirmed restart, inspect outcomes. Sync token: publish validated telemetry for its bound server, retrieve/claim commands for that server and report outcomes. It cannot create commands, mint admin sessions or access unrelated records. Executor: accept only authenticated local requests for fixed capabilities.
- Use TLS, bounded payloads, strict schema validation, rate limits and audit events with redacted credentials. Design same-origin API routing where feasible; otherwise explicitly allow only the board origin, never wildcard credentialed CORS.
- Local browser administration requires a secure session: `Secure`, `HttpOnly`, appropriate `SameSite` cookies and session expiry/revocation. The cloud board uses Access-managed identity/session expiry. Both browser APIs require CSRF token validation and Origin checks for mutations. No state changes via GET. The confirmation UI shows exact target and action; backend binds confirmation to administrator, action, target and a short expiry, and consumes it once. Chat cannot manufacture or bypass this confirmation.

### Telemetry, retention and availability

- Record server identity, unique event ID, reason (`startup`, `hourly`, `after_action`), measured time and authoritative Worker receive time. Include collection errors and host/container provenance. Store UTC times and validate clock skew; freshness is separate from values.
- Define hourly slots as UTC intervals. Establish enrollment time and count only full hourly slots beginning at or after enrollment and completed by the reporting cutoff. Exclude the in-progress and partial enrollment slots. With no completed slots, report availability as unavailable, not 100%.
- Numerator: distinct eligible slots with an accepted hourly sample; denominator: eligible completed slots within the ten-day reporting window. Persist the original slot identifier across retries. Late accepted samples may fill their original eligible slot while retained, never the receive-time slot. Reject impossible/future or out-of-enrollment slot attribution. Multiple samples/retries cannot increase a slot count above one; startup and after-action events do not enter this numerator.
- Label the result **hourly sample availability**, not server or tunnel uptime. Missing samples mean unknown: networking, scheduler or board failure could explain them. Display latest accepted contact time separately, alongside latest measured telemetry time and explicit tunnel-health observations. Last contact does not fill historical gaps.
- Retain status events and command history for ten days, with a documented UTC cutoff and bounded cleanup delay. Proposed anchors: Worker receive time for status and Worker creation time for command history. Availability queries use slot time and enrollment, not raw event counts. Filter expired history from reads even before physical cleanup.
- Run idempotent scheduled Worker cleanup independently of home sync, plus bounded cleanup on successful sync. Cleanup must continue when the home server is offline. Set maximum command TTL and lease far below ten days; commands cannot remain runnable beyond retention. Keep enrollment metadata separately. Retain minimal local deduplication/uncertainty records beyond command history if needed to prevent re-execution; document their different purpose and deletion rules rather than pretending ten-day history deletion safely erases execution identity.

### Queue and execution semantics

- Commands have UUID, server, fixed action, confirmation/audit reference, Worker-assigned creation/expiry times, state, claim identity, lease deadline and bounded outcome details. States: `pending`, `running`, `succeeded`, `failed`, `expired`. UUID is identity, not authorization.
- Enqueue idempotently on UUID; reject reuse with different content. Only `restart_tunnel` is mutable. Use atomic conditional claim (`pending` and unexpired to `running`) and serialize restarts per target. A losing concurrent claimant must not execute.
- Persist the local UUID/claim and an execution-intent record durably before contacting the executor. Executor also durably deduplicates UUIDs across agent restarts. Repeated reports and lost HTTP responses must reconcile existing records, not create new actions. Local direct requests use the same ledger and serialization path.
- Check expiry and lease ownership before dispatch; prevent delayed stale dispatch at the executor too. Use bounded request, restart and health-check deadlines. Agree lease duration and safety margin before deployment. A lease is coordination, not proof that an external action did or did not happen.
- Expired pending commands become `expired`. If a running command times out or ownership/outcome becomes uncertain, reconcile durable evidence and report `failed` with an explicit `unknown_outcome` reason when certainty is impossible. Do not return it to pending or automatically restart again. Require manual inspection before a separately confirmed new UUID. A running action cannot be assumed undone because its lease or command TTL elapsed.
- There is no claim of exactly-once execution across a crash between external side effects and durable recording. A crash after intent but before known outcome is also conservatively uncertain unless evidence proves no dispatch occurred. Lease takeover must not redispatch an uncertain operation. Block new restarts for a target with unresolved execution uncertainty.
- Mark `succeeded` only after checking actual tunnel health using a deployment-approved probe, not merely executor exit status or a live process. Retain bounded diagnostic evidence. Report action failure separately from failure to upload its result; retry result delivery without re-executing.

## Milestones, deliverables and exit gates

### M0 — Mandatory tunnel-down feasibility gate (before full app)

- [ ] Inspect host topology, tunnel implementation and outbound routing; identify an independent tested local/SSH recovery path.
- [ ] Build only a disposable/minimal authenticated status-post and command-retrieval spike in the intended main backend container networking context, plus a minimal independent endpoint/store.
- [ ] Give the spike **no executor access** and disable dispatch by construction. Queue a confirmed test restart with a UUID and bounded expiry; retrieval alone must never execute it or falsely acknowledge success.
- [ ] Follow the deployed runbook in `VERIFICATION.md`: deliberately stop the tunnel, prove actual tunnel unavailability, post fresh status to the board and retrieve the matching command over outbound HTTPS.
- [ ] Recover manually using the independent console, retire/expire the test command and verify no deferred execution is possible.

**Deliverable:** recorded topology, deployment inputs, sanitized request/response evidence and recovery record. **Exit gate:** fresh independent receipt and retrieval while tunnel is verifiably stopped, with outbound internet working and no restart dispatch. If this fails, stop and redesign networking; do not proceed to full app. Pre-existing board data or a host-only request is not proof.

### M1 — Local dashboard and read-only host diagnostics

- [ ] Initialize the Go module and pinned JavaScript tooling/dependencies; implement validated JSON contracts, SQLite migrations and local auth after M0 passes.
- [ ] Implement read-only host-helper metrics collection with least privilege, timestamping, failures and container/host labels. MCP integration is deferred to M4.
- [ ] Build manual dashboard with freshness, tunnel health and unavailable-state handling.
- [ ] Validate readings against independent host observations and make the dashboard work without Ollama or Cloudflare.

**Deliverable:** local read-only dashboard and focused tests. **Exit gate:** authenticated access, trustworthy host metrics and no mutation interface enabled.

### M2 — Protected independent board, sync and retention

- [ ] Implement static board, protected Worker APIs, migrations and enrollment metadata.
- [ ] Add startup/hourly/after-action event contracts, durable retry outbox, bounded backoff and token rotation. Never execute an action as a side effect of telemetry retry.
- [ ] Implement hourly-slot accounting, freshness display, scheduled and sync-triggered cleanup, and observable cleanup failures.
- [ ] Implement protected queue storage/inspection and retrieval with execution still disabled, including admin/sync role tests.

**Deliverable:** independently reachable board, authenticated sync and ten-day history lifecycle. **Exit gate:** security, retention, deduplication and availability acceptance tests pass; M0 is repeated with the intended deployment configuration.

### M3 — Explicitly confirmed dedicated restart

- [ ] Extend the Ubuntu systemd host helper with the fixed cloudflared restart target and health probe; verify socket permissions and narrowly scoped systemd authorization.
- [ ] Implement atomic claims, durable ledgers, target serialization, timeout/lease behavior and crash reconciliation.
- [ ] Add manual local and board confirmation flows and after-action sync; record unknown outcomes without automatic replay.
- [ ] Exercise unauthorized, expired, duplicate, concurrent and crash/lost-response cases before enabling real restart in production.

**Deliverable:** narrow audited restart capability with independent recovery instructions. **Exit gate:** all restart/security scenarios pass, actual tunnel recovery is demonstrated, and manual recovery remains functional. Repeat tunnel-down testing under controlled conditions; unlike M0, any execution test is separately confirmed.

### M4 — Optional Ollama chat

- [ ] Benchmark candidate models later on actual hardware for structured output, latency and resource use; record exact model/version only then.
- [ ] Add MCP adapters and connect schema-validated read-only tools and a restart *proposal* flow to the existing confirmation mechanism, within the main Go project.
- [ ] Test malformed output, invented tools, prompt injection and attempts to smuggle shell/service arguments.
- [ ] Verify model failure/removal leaves every manual workflow operational.

**Deliverable:** optional chat over established capabilities. **Exit gate:** model cannot expand privileges or bypass confirmation; manual operation passes with no model running.

## Decisions still required

- Ubuntu version, CPU architecture, RAM and disk layout; GPU/VRAM and Ollama capacity only for the later AI phase.
- Exact cloudflared systemd unit, installation ownership, topology, health probes and stop/start/recovery procedures.
- Host-helper systemd permissions, Unix-socket UID/GID mapping, host metric access and SQLite storage/fsync guarantees.
- Container networking, DNS, outbound proxy/firewall behavior when tunnel is stopped; independent recovery transport.
- Domains, local HTTPS termination, Cloudflare account/Access identity policy, Worker static-assets routing, scheduler limits, costs and SQLite/D1 backup/restore plans.
- Local admin enrollment and password/session implementation, Access issuer/audience, credential provisioning/rotation, session lifetime and CSRF deployment details.
- Poll cadence, command TTL, lease/deadline margins, clock-skew tolerance, cleanup interval/deletion SLA and uncertainty resolution procedure.

## Verification status

Backend package tests, vetting, a local HTTP/SQLite smoke test, frontend typechecking/tests/build, and local responsive browser checks have passed. Security, cross-project integration, deployed networking, model, and recovery verification have not started. The workspace was not a Git repository at initial inspection. See `VERIFICATION.md` for planned evidence and acceptance gates; no milestone gate has passed.
