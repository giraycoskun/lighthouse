# Cloudflare deployment

Deploy `board/frontend/dist` as a Cloudflare Pages project. The static shell does not require Pages Functions or a Worker and therefore does not consume Workers request quota. Configure the Pages build with root directory `board/frontend`, build command `npm ci && npm run build`, and output directory `dist`.

Add a same-origin Worker route only when live status, machine sync, commands, D1 persistence, or scheduled cleanup are implemented. Keep that code and its migrations in `board/worker`; use a single `board/wrangler.jsonc` when implementation starts. Do not route ordinary static asset requests through the Worker. Pages Functions also count against Workers quotas, so they offer no free-plan advantage for this design.

Protect the deployed board hostname with Cloudflare Access before enabling private data. Validate Access JWTs again in the Worker, give outbound server sync a dedicated non-interactive route with scoped-token enforcement, and ensure alternate Worker hostnames cannot bypass authorization. Provision sync secrets through runtime secret management, never a static frontend environment variable. Document account/domain, allowed administrator identity, Access audience/issuer, D1 backup/restore, scheduler limits and cleanup monitoring. Pin a tested Worker compatibility date and Wrangler version.

Current free-plan design targets:

- Static Pages asset requests do not invoke a Function and are free/unlimited.
- Pages Free allows 500 builds per month, one concurrent build, and 20,000 files per site.
- If enabled later, Workers Free allows 100,000 requests per day with a 10 ms CPU budget per invocation.
- D1 Free supports up to 10 databases, 500 MB per database, and 50 queries per Worker invocation.
- Cloudflare Zero Trust Free supports up to 50 users, which is sufficient for the initial one-administrator scope.

Deploy a minimal authenticated endpoint/store for M0 before the full board UI. Cloudflare provisioning may incur costs; confirm account limits first. Upload only required host telemetry and bounded redacted outcomes, not unrestricted host logs. No resources or credentials have been provisioned by this scaffold.
