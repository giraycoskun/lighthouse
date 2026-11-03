# Host integration and recovery — planned

Confirmed target: Ubuntu, main app in Docker, `cloudflared` managed by host systemd. Record Ubuntu version/architecture, exact systemd unit, host metric sources, outbound DNS/routing and approved health probes before adding service definitions or permission rules.

Install the Go host helper as a systemd service with a permission-restricted Unix socket, fixed tunnel target and persistent host-side SQLite ledger. Configure socket group access for the non-root container process. Restrict systemd permissions to the configured unit. No generic sudo rule, application Docker socket or privileged application container is acceptable. Secret provisioning and rotation must be separate from source control.

Write and test an independent local/SSH recovery procedure that does not rely on the tunnel being tested. The macOS development machine cannot substitute for the Ubuntu deployment host in metrics or permission tests. Follow the [tunnel-down runbook](../../../docs/VERIFICATION.md) before any outage experiment.
