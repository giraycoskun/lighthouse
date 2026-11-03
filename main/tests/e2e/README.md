# End-to-end tests — planned

Add browser tests for the local dashboard, local login, confirmation and command outcomes as the UI arrives. Cloud board UI tests live in `board/tests/`. This directory also owns cross-project recovery scenarios. Add a clearly opt-in deployed suite for real networking and host integration; mocks cannot establish tunnel-independent sync.

Cover the M0 retrieval-only proof, later confirmed tunnel recovery, outbound-internet loss, stopped agent, stale status, expiry, credential rotation and all manual workflows with Ollama disabled. Preserve independent recovery access and sanitized evidence.

No outage/action test may run automatically against a production host. See the [verification runbook](../../../docs/VERIFICATION.md) for prerequisites, abort conditions and recovery.
