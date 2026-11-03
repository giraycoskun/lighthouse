# Bulletin board Worker — planned

TypeScript Cloudflare Worker with D1 persistence. Own Cloudflare Access JWT validation and administrator authorization, scoped sync-token validation, telemetry ingestion, atomic command claims, result reporting and scheduled retention cleanup. Validate JWT signature, issuer, audience and expiry; do not trust a forwarded identity header alone.

Planned modules: bindings/config, auth, validation, status, commands, repository and cleanup. Use documented JSON-over-HTTPS contracts with the Go backend and validate input in both languages. Keep contract fixtures under project tests rather than creating shared runtime packages. The sync token cannot enqueue commands or create administrator sessions.

Serve the static frontend and API from one independent Cloudflare origin. Access protects the board and admin routes. A dedicated sync route permits machine access without interactive Access login, but always enforces its scoped sync token and cannot reach admin handlers. Enforce CSRF protection and Origin checks for browser mutations. Cleanup must run even when the server cannot sync. Keep receive timestamps, measurement timestamps and original hourly slot identity distinct.

No dependency on the home tunnel, host executor or Ollama. See [security and persistence rules](../../../docs/BUILD_PLAN.md).
