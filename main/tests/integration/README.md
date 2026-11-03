# Integration tests — planned

Add tests as components are implemented; there are no functional tests here yet. Co-locate Go and frontend unit tests with source; use this directory for main-project boundary tests with controlled clocks, a host-helper fake and a board API fake. Cross-project contract tests can use local Worker/D1 tooling; board-owned tests live in `board/tests/`.

Required coverage: runtime contracts; admin/sync/executor role separation; CSRF/session handling; durable sync retries; atomic claims; duplicate/concurrent restart IDs; expired commands; crash/unknown-outcome reconciliation; result-upload failure without re-execution; ten-day retention; distinct hourly-slot accounting; host metric provenance; model/board failure independence.

Tests must never restart a real tunnel by default. Real host actions require a separately configured, explicitly authorized deployed acceptance run. See the [verification matrix](../../../docs/VERIFICATION.md).
