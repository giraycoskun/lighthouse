# Lighthouse verification plan

## Status and interpretation

**This is a planned acceptance specification, not a product acceptance report.** The backend foundation and minimal status dashboard have focused local checks, but no deployed acceptance scenario below has passed. Authentication, host integration, cloud sync, commands, deployment, and the full executable acceptance suite remain future deliverables. No service names, host CLI paths, or deployment commands are assumed.

Current backend checks:

| Check | Result | Scope |
| --- | --- | --- |
| `go test ./...` | Passed | Configuration, migrations, HTTP responses, OpenAPI delivery, and Swagger UI routing |
| `go vet ./...` | Passed | Go static analysis for the current backend packages |
| Local process smoke test | Passed | Listening server, SQLite readiness, status, OpenAPI, embedded Swagger UI, and migration tables |
| `npm run typecheck` | Passed | Strict TypeScript checking for the dashboard and Vite configuration |
| `npm test` | Passed: 2 tests | Healthy API rendering and unreachable-backend state |
| `npm run build` | Passed | Vite production bundle generated successfully |
| Local browser smoke test | Passed | Live API data, Swagger proxy, and responsive 390px layout without horizontal overflow |
| Board `npm run typecheck` | Passed | Strict TypeScript checking for the independent static board |
| Board `npm test` | Passed: 2 tests | Truthful unconfigured state, zero default API calls, and disabled recovery action |
| Board `npm run build` | Passed | Cloudflare Pages-ready static bundle and security header file generated |
| Board browser smoke test | Passed | Static empty state, zero API requests, disabled recovery, and responsive 390px layout without overflow |

These checks do not establish authentication, authorization, deployment safety, tunnel-independent networking, or restart correctness.

## Verification matrix

All rows are **planned / not executed**. Milestones refer to `BUILD_PLAN.md`.

| Gate | Area | Required acceptance evidence | Intended location/method |
| --- | --- | --- | --- |
| M0, repeat M2 | Tunnel-independent outbound path | Fresh status receipt and restart retrieval from main container while tunnel is stopped; zero dispatch | Deployed runbook below |
| M1 | Host metrics | Host reference readings, provenance, tolerance and timestamps; container metrics distinguished | Integration fixtures + deployed comparison |
| M1 | Read-only boundary | Diagnostics cannot mutate host or accept shell input | Contract/integration tests + permission inspection |
| M2 | Board independence | Board reachable from independent client with tunnel down; unauthenticated private reads rejected | Deployed checks + e2e |
| M1/M2 | Auth and roles | Local login, Access JWT/identity validation, admin/sync/helper separation, machine sync without interactive login | Integration authorization matrix + deployed Access checks |
| M1/M2 | Cookies and CSRF | Secure local sessions, Access session expiry, forged mutations rejected, explicit-origin policy | Browser e2e + API tests |
| M2 | Sync and availability | Idempotent retries, completed-slot denominator, unknown gaps, distinct last contact | Clock-controlled integration tests |
| M2 | Retention | Ten-day read cutoff and scheduled cleanup without home sync | Controlled-clock database tests + scheduled deployed evidence |
| M3 | Confirmation and queue | One-use action-bound confirmation, atomic claims, UUID validation, expiry | Integration + manual e2e |
| M3 | Restart and recovery | Actual healthy tunnel, not just successful process exit | Executor fault injection + controlled deployment |
| M3 | Crash/replay/concurrency | No automatic replay of uncertain effects, durable records and target locking | Persistent fault-injection harness |
| M4 | Optional model | Exact allowlist, rejected injected arguments, manual operation without Ollama | Contract tests + e2e + later hardware benchmark |

For every scenario, record implementation revision (or artifact digest), configuration identifiers without secrets, UTC start/end, input IDs, expected result, observed result, evidence references and pass/fail/not-run status. A test skipped due to missing deployment access remains not-run, not passed.

## First gate: safe deployed tunnel-down runbook

### Objective and limitations

Before full application development, prove the intended main/backend container can send status and retrieve a queued `restart_tunnel` command over outbound HTTPS while the home tunnel is stopped. The board must be independent of that tunnel. This is a **transport-only spike**, not a restart test: retrieving the command must not dispatch any host action, mark it successful or schedule future execution.

### 1. Prepare and record deployment-specific inputs

- [ ] Identify the tunnel implementation, installation owner, current routing and exact administrator-approved stop/start procedures. Record resolved operational commands privately after host inspection; this document supplies none.
- [ ] Establish an independent local console or SSH path that does not traverse the tunnel being stopped. Test it by opening a separate session and verifying host access. Have physical/local recovery available if SSH independence is uncertain. Keep the recovery session open throughout.
- [ ] Record an authorized maintenance window, operator, maximum stop interval and abort criteria. Warn affected users; do not perform this on the sole remote access path.
- [ ] Identify the main container, its actual network namespace, DNS and outbound route. Use the intended deployment networking, not a substitute host process or more permissive container.
- [ ] Deploy a minimal independent Cloudflare board endpoint/store with separate admin and scoped sync credentials. Confirm its address does not depend on the home tunnel. Define bounded HTTPS request timeouts and an external client from which to inspect receipts.
- [ ] Confirm the spike has no executor socket, host-control credentials, Docker socket, privileged mount or dispatch worker. Inspect configuration and permissions, not just a UI toggle. No production execution agent may consume the spike queue.
- [ ] Isolate the test server/queue from production, choose unique event and command UUIDs and an expiry that covers the short test. Prepare a way to expire/retire the test record before ever enabling execution.
- [ ] Define evidence sources for tunnel stopped state, tunneled-route failure, outbound connectivity and independent receipt. Redact all tokens and cookies.

**Do not start if any recovery, isolation or non-execution prerequisite is unmet.**

### 2. Establish a baseline

- [ ] From the recovery console, record tunnel state and a successful actual tunneled-service health probe. A process listing alone is insufficient.
- [ ] From inside the main container, post a unique baseline status event and retrieve the empty/test queue through the intended HTTPS endpoint with the sync token.
- [ ] From the independent client, authenticate as administrator and confirm the baseline event and Worker receive timestamp. Demonstrate that the sync token cannot enqueue a command.
- [ ] Record normal DNS/TLS/outbound HTTPS behavior using the board endpoint or another explicitly approved destination.

### 3. Stop the tunnel deliberately

- [ ] Using the independent recovery console and inspected host-specific procedure, stop only the identified tunnel. Do not change firewall rules, stop unrelated networking or disable the recovery path.
- [ ] Verify stopped state using the deployment's tunnel control/status mechanism **and** a failed actual tunnel health probe from an independent client. Record the interval. Check that the recovery session still works.
- [ ] If the tunnel unexpectedly remains available or automatically restarts, stop the test and resolve the topology/supervision issue. Do not count that interval as a tunnel-down proof.

### 4. Prove outbound sync and command retrieval without execution

- [ ] While stopped, use the main container to post a newly generated status event, including tunnel-unavailable observation and measurement time. Preserve request/event ID and a bounded response record.
- [ ] From the independent administrator client, verify a new persisted receipt with server-side receive time within the stopped interval. A cached page, old sample or local outbox entry is not sufficient.
- [ ] From the board, explicitly confirm creation of a test `restart_tunnel` command with the recorded UUID and expiry after the stop. This confirms command creation only; the isolated retrieval spike cannot execute it.
- [ ] From the main container, retrieve that exact command over authenticated HTTPS and record matching UUID/action/server/expiry. Use a non-claiming retrieval path; leave it pending. If the endpoint cannot retrieve without execution, redesign it before testing.
- [ ] Demonstrate successful outbound DNS/TLS/HTTPS while the tunnel remains stopped. The new board POST and GET are essential proof; an additional approved external HTTPS destination may corroborate general egress.
- [ ] Confirm no executor invocation occurred and that the tunnel did not restart. Capture both stopped-state evidence and independent route health again after retrieval.

**Pass criteria:** all proof originates from the intended container; both fresh receipt and matching command retrieval occur inside a verified stopped interval; independent outbound internet and recovery access work; no dispatch occurs. Any missing evidence leaves the gate failed or inconclusive.

### 5. Recover and retire the test safely

- [ ] Restore the tunnel manually through the independent console using the prevalidated procedure, regardless of pass/fail. Do not rely on the queued command or the application for recovery.
- [ ] Verify actual tunnel connectivity to the intended service, then check control/process state and local dashboard access where available. Keep the independent console until recovery is proven.
- [ ] Expire/retire the test command through the authenticated test-only administration/storage procedure, or wait for its validated expiry while all execution remains disabled. Confirm it is no longer claimable. Preserve its audit record rather than hiding the test by deleting evidence.
- [ ] Stop/remove the retrieval spike or keep its execution capability absent. Verify no buffered command can be dispatched when a future executor is enabled; never migrate a pending test queue into production.
- [ ] Record recovery time, final health, command terminal state and evidence. Remove temporary test credentials independently from production credentials.

### Abort and failure handling

Abort at the agreed deadline, loss of independent access, unexpected host impact, actual dispatch, credential leakage, failed outbound requests or ambiguous tunnel state. Restore through the independent console immediately when safe. If that fails, use the prearranged physical/local recovery path and stop further experimentation. Do not broaden container privileges or enable automatic execution to rescue this test. Investigate networking before continuing to M1. Record failures as failures, not inferred successes.

### Minimum evidence bundle

Sanitized topology and container-network description; configuration/artifact identity; baseline and stopped/restored tunnel probes; independent console continuity; event UUID and measured/Worker-received times; command UUID and retrieved payload metadata; HTTPS result evidence; proof of absent dispatch capability and zero invocation; expired/non-claimable test record; recovery results. Never capture authorization headers, secret values or raw session cookies.

## Detailed planned acceptance scenarios

### A. Authentication, credentials and capability boundaries

1. **Private reads:** unauthenticated and expired-session requests cannot view status/history or queue data. Public static assets contain no private snapshots or credentials. Direct Worker calls enforce the same rules as the UI.
2. **Role separation:** admin can view/enqueue after confirmation; sync token can publish/claim/report only for its bound server and cannot enqueue, issue sessions or alter enrollment. Verify Access JWT signature/issuer/audience/expiry and allowed administrator identity; forged identity headers or alternate Worker hostnames must not bypass authorization. Verify dedicated machine sync works without interactive Access login and cannot enter admin routes. Check host-helper socket access from the intended container UID/GID and rejection of unauthorized local callers. Test missing, malformed, revoked and rotated tokens plus cross-server identifiers. Even a one-server deployment needs negative ownership tests.
3. **Sessions/CSRF:** for local login, verify `Secure`, `HttpOnly`, chosen `SameSite`, expiry and logout/revocation. For the cloud board, verify Access session expiry and identity-policy enforcement. Neither uses session tokens in URLs/local storage. Reject missing/incorrect CSRF token, hostile Origin, cross-origin credentialed requests and GET mutations. Verify allowed same-origin flow succeeds. Test both local and board mutation surfaces; local login must work with internet unavailable.
4. **Confirmation:** reject reused, expired, wrong-admin, wrong-action and wrong-target confirmations. A valid confirmation authorizes only its exact restart request. Browser retries reuse the original UUID and cannot create multiple restarts. Neither a chat message nor model-generated JSON constitutes confirmation.
5. **Restricted executor:** reject unknown actions, extra fields, shell metacharacters, caller-selected service names/paths and unauthenticated IPC. Inspect runtime privileges and mounts: no application Docker socket, general host shell, broad privileged container or hidden fallback execution path. Read-only tools remain read-only.
6. **Secret handling:** inspect built static assets, logs, errors, browser persistence and model prompts for credential leakage. Rotate/revoke sync and administrator credentials separately and verify the other role remains operational. Verify payload/rate limits and redacted audit events.

### B. Telemetry, accounting and retention

1. **Host versus container:** compare host disk capacity/free space, memory, CPU over a defined interval and uptime with independently obtained host observations. Document tolerance and collection timing. Restart only the app container: host uptime must not reset. Change container limits: host totals must not become container totals. Collection failure shows unavailable/stale, not zero or fabricated healthy values.
2. **Sync reasons and retry:** trigger startup, an hourly tick and a completed action; verify distinct reason fields and event IDs. Lose a POST response after persistence, then retry: one logical event remains. Restart the agent with a pending outbox item and verify durable retry without action re-execution. Board failure must not break the manual local dashboard; retries use bounded backoff.
3. **Completed hourly slots:** enroll at 10:20 UTC. At 13:30, only 11:00–12:00 and 12:00–13:00 are eligible: denominator 2. Exclude the partial enrollment hour and current 13:00–14:00 slot. One hourly sample yields 1/2; repeating it, adding startup events or after-action events leaves 1/2. With no eligible completed slots, show unavailable.
4. **Late arrivals:** accept a delayed valid sample for the missing 12:00–13:00 slot and show 2/2 without increasing the denominator. Attribute it to its original slot, not receive time. Reject future or pre-enrollment slots; exclude slots outside the ten-day window even if their events arrived recently. Test exact hour/window boundaries and skew handling.
5. **Unknown gaps and contact:** suppress two hourly deliveries while allowing a later startup or after-action contact. Latest contact advances, but gaps remain unknown and availability does not improve from that contact. UI must not label missing samples as proven downtime or hourly sample availability as tunnel uptime. Display measured time separately from receipt time.
6. **Ten-day retention:** with a controlled UTC clock, seed status and commands just before, exactly at and after the cutoff using the specified receive/creation anchors. Define equality consistently (retain timestamps at the cutoff; remove older ones). Verify read filtering, index-backed bounded cleanup and idempotency. Test that late events cannot resurrect out-of-window availability slots.
7. **Independent cleanup:** disable all home sync for longer than the cleanup interval. Trigger/observe the scheduled Worker cleanup and confirm physical deletion within the chosen SLA. Separately disable the scheduler in a test environment and verify sync-triggered cleanup works. Both paths obey identical cutoff rules; scheduler failure is observable. Neither path depends on Ollama.
8. **History versus dedup:** remove old visible command history and replay its UUID or stale claim against the executor. It must not execute. Verify the chosen compact ledger/expiry design still rejects it, including after agent/executor restart and supported backup restore. Retention must not silently remove uncertainty locks or make ancient commands executable.

### C. Queue, leases and restart correctness

Use a deterministic fake executor and persistent storage for fault injection before any real restart. Then repeat only the explicitly authorized deployment cases with independent recovery ready.

| Scenario | Required result |
| --- | --- |
| Valid confirmed request | One UUID moves `pending` → `running` → `succeeded` only after actual healthy tunnel evidence; audit and after-action sync correlate to that UUID |
| Unauthorized enqueue/claim/report | Rejected without state change or executor invocation; wrong server, wrong role and stale claim tested |
| Duplicate UUID, same payload | Idempotent existing result/state, not a new action |
| Duplicate UUID, different payload | Conflict/rejection, never overwrite original authorization |
| Expired pending request | `expired`; zero execution, including when retrieved before expiry but dispatched afterward |
| Two claimants, same UUID | Exactly one atomic claim wins; losing claimant cannot invoke executor |
| Different UUIDs, same target | At most one in flight; later request waits/rechecks expiry or is rejected; never simultaneous restarts |
| Claim response lost | Reconcile by UUID/claim; no blind second dispatch |
| Crash before durable intent | Recover only after proving no dispatch was possible and confirming valid ownership/expiry |
| Crash after intent, before dispatch certainty | Treat as uncertain unless durable evidence proves no action; no automatic replay |
| Crash during/after external restart | Reconcile durable executor evidence; if outcome cannot be established, `failed` with `unknown_outcome`, target blocked pending manual inspection |
| Executor completion response lost | Query existing durable outcome; do not execute again. Persist/retry reporting independently |
| Worker result-upload response lost | Idempotent report/reconciliation preserves terminal outcome; no new restart |
| Lease expires before dispatch | Reject stale dispatch, including a delayed request reaching the executor; no action under stale ownership |
| Lease expires during action | No lease takeover that redispatches; bounded reconciliation, unknown outcome if necessary, no inference that expiry reversed the action |
| Restart returns success but tunnel unhealthy | Not `succeeded`; bounded health check fails with diagnostic evidence |
| Restart times out/process hangs | Bound request and health deadlines; establish known failure or unknown outcome, not endless running or automatic retry |
| Board unavailable after local completion | Persist local outcome and retry after-action sync; never repeat the restart to produce a report |
| Delayed stale result after terminal state | Reject or reconcile against matching durable evidence; no terminal-state regression or overwrite by a stale owner |
| New request after uncertain action | Block until operator inspects actual host state and records uncertainty resolution; require a fresh explicit confirmation and new UUID |

Record invocation counts and durable records, not just HTTP status. Persist records across process/container restart tests. Exercise local manual requests and board requests concurrently through the same executor serialization boundary. Verify no duplicate caused by a double-click, network retry, timer tick or crash recovery.

Do not claim magical exactly-once execution: external restart and durable recording cannot generally form one atomic transaction. The acceptance requirement is conservative deduplication and no automatic replay of an uncertain effect. A known healthy tunnel after recovery does not by itself prove which command caused it.

### D. Optional Ollama and manual fallback

- With Ollama stopped, absent or returning errors, use manual authenticated diagnostics, board sync, confirmation and restart workflows successfully. Model failure must not delay queue processing or cleanup.
- Feed malformed structured output, unknown tool names, unexpected arguments, oversized output and diagnostic text containing instructions. Reject safely without executing shell or expanding the tool allowlist.
- Ask the model to restart without confirmation or forge a confirmation token. It may propose the dedicated action but must not dispatch it. Verify the normal backend authorization boundary still applies.
- Benchmark candidate models only after host CPU/RAM/GPU/VRAM are known. Record exact model artifact, structured-tool reliability, latency, memory pressure and fallback behavior. No model choice or benchmark result is asserted now.

## Release evidence and unresolved inputs

- [ ] M0 transport-only evidence accepted before full-app work; failed gate has documented remediation and a new successful run.
- [ ] Milestone-specific tests and permissions/configuration reviewed; unresolved failures are not relabeled as passed.
- [ ] Host-specific target, health probe, independent recovery path and operator procedure verified without assuming service names or CLI paths.
- [ ] Poll cadence, command TTL, lease/safety margin, clock skew, cleanup interval/SLA and dedup retention are selected and tested at boundaries.
- [ ] Scheduled retention, credential rotation, durable-volume recovery and uncertainty resolution have observed evidence.
- [ ] Full manual path works with no model. Deployed restart checks demonstrate actual tunnel health, with recovery available throughout.

Until an implementation and deployment exist, executable test commands and measured results remain intentionally unspecified. Review this plan for completeness now; populate pass/fail evidence only when the corresponding checks are actually run.
