# Bulletin board web application

Static React/Vite/TypeScript frontend designed for Cloudflare Pages. The initial build requires no Worker and makes no API request by default. It presents truthful unknown/unconfigured states, a ten-day hourly timeline, a disabled recovery preview, and no embedded secret or private telemetry.

## Run and verify

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

The local development URL is `http://localhost:5174`. Deploy `dist/` to Cloudflare Pages. Recommended Pages settings when the Git repository is connected:

| Setting | Value |
| --- | --- |
| Root directory | `board/frontend` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Node version | `24` |

Protect the deployed hostname with Cloudflare Access before enabling private data. The checked-in `_headers` file applies a restrictive Content Security Policy and disables framing, browser device APIs, and indexing.

## When a Worker is needed

Static hosting needs no Worker. Add the same-origin Worker API only when live functionality is enabled:

- `GET /api/v1/board/status` for protected status/history reads.
- A separate authenticated machine-sync route for server uploads.
- Confirmed command creation and outcome inspection.
- D1 persistence and scheduled retention cleanup.

Build with `VITE_BOARD_API_ENABLED=true` only after that API is deployed and protected. This flag is not authorization; the Worker must validate Cloudflare Access and machine credentials itself. Never place the sync token in a `VITE_*` variable because Vite variables are public build-time data.

Later views will add confirmed restart and command outcomes (`pending`, `running`, `succeeded`, `failed`, `expired`). Display expected pickup delay and command expiry according to the selected polling cadence.

Missing samples mean unknown/unreachable, not confirmed server downtime. The board runs no model. Natural-language command entry is deferred. See [verification scenarios](../../../docs/VERIFICATION.md).
