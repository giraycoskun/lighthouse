# Ubuntu host helper — planned

A small Go binary from the backend module, installed as an Ubuntu systemd service. It collects host metrics and performs one fixed `cloudflared` systemd restart. This directory documents the boundary; implementation will live in `cmd/host-helper` and internal Go packages. Confirm the actual unit name and approved tunnel health probe during host setup.

Use a permission-restricted Unix socket in a dedicated host runtime directory mounted into the app container. Align container UID/GID and socket permissions; mount the directory so socket recreation on helper restart works. Use a fixed deployment-configured target, bounded calls and a separate durable SQLite command-ID ledger on the host. Serialize restarts, reject stale/unauthorized dispatch and verify actual tunnel health rather than only process exit status. Grant only the systemd control permission needed for the fixed unit; select and verify the exact Ubuntu permission mechanism during implementation.

Do not expose an arbitrary shell, caller-controlled executable/arguments, generic container management or public HTTP service. Do not grant the local API broad root/sudo privileges or Docker socket access. Unknown outcomes after a crash require reconciliation/manual inspection, not automatic replay.

Manual recovery must remain possible without this service, the main app or the tunnel. See [execution semantics](../../../docs/BUILD_PLAN.md).
