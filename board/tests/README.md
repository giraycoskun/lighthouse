# Cloudflare tests — planned

Own Worker/D1 integration tests and board browser tests here. Cover Access JWT validation and administrator authorization, scoped machine sync, CSRF/Origin checks, queue claims, retention, hourly accounting and migrations. Exercise the deployed Access policy as well as Worker authorization; local mocks do not prove edge configuration.

Keep JSON contract fixtures compatible with Go backend tests. Cross-project tunnel-down and recovery scenarios are owned by `main/tests/e2e/`. No functional tests exist yet; see [the verification plan](../../docs/VERIFICATION.md).
