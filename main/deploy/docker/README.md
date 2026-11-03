# Container deployment — planned

Target Ubuntu with one application container: a multi-stage build compiles the React frontend and Go backend; the Go process serves the built frontend and API. Node is build/development tooling only. Begin with a minimal M0 image, then add the full application Dockerfile and Compose configuration after the networking proof. Ollama and MCP are deferred.

Plan a non-root Go process, dropped capabilities, a read-only root filesystem where feasible, bounded resources, health checks and a persistent SQLite data volume. The Ubuntu systemd host helper runs outside the container. Mount only its dedicated Unix-socket directory when host integration is enabled; M0 has no helper access. Never mount the Docker socket or host systemd control socket into the application container.

Prove outbound board HTTPS from the exact deployed networking context while the tunnel is stopped. Do not accidentally route sync through the tunnel. Inject runtime secrets outside images and static bundles. Verify persistence after container replacement, not only process restart.

No deployable Compose file or image exists yet; do not treat this directory as a working deployment.
