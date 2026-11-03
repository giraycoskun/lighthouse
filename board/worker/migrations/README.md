# D1 migrations — planned

Add numbered, version-controlled SQL migrations once contracts and the M0 persistence spike are agreed. No schema has been applied yet.

Planned records: server enrollment; uniquely identified status events with measured/received times and hourly slot; commands with server/action/confirmation, expiry, state, claim/lease and bounded result. Cloudflare Access owns cloud administrator identity; do not add a second cloud password database.

Index server/time, hourly-slot queries and pending command lookup. Enforce command identity and valid state transitions atomically. Use Worker-authoritative times for queue expiry. Ten-day history cleanup must not accidentally remove enrollment metadata or reopen replay windows; local executor deduplication has a separately defined lifecycle.

Verify fresh migration, repeated application through the migration runner, cutoff boundaries and backup/restore before deployment. Never put credentials or real production telemetry in migration fixtures.
