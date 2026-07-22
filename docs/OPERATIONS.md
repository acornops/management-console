# Management Console Operations

## Runtime Contract

- The production image serves static assets through nginx.
- Hashed build assets under `/assets/` are served with long-lived immutable cache headers.
- Runtime language files under `/locales/` are served with `Cache-Control: no-cache` and missing files return 404.
- `index.html` and SPA fallback routes are served with `Cache-Control: no-cache`.
- nginx gzip compression is enabled for JavaScript, CSS, JSON, SVG, XML, and text responses.
- nginx listens on container port `8080` as a non-root user.
- Browser hardening headers are set by nginx, including CSP, HSTS, nosniff, frame denial, referrer policy, and permissions policy.
- The default production base path is `/`.
- Browser API calls should use same-origin `/api` routing. The production nginx CSP defaults `connect-src` to same-origin; explicit public control-plane base URLs require a matching custom CSP.
- Full service exposure and TLS are owned by `acornops-deployment`.
- Production builds require `VITE_APP_DATA_MODE=control-plane`; the fixture transport cannot be enabled in a production build.

## Production Paths

- Management console: `https://console.acornops.dev/`
- Canonical public control-plane API: `https://api.acornops.dev/api/v1`

## Health Checks

The nginx container should be probed at the configured base path:

```text
GET /
```

## Failure Modes

- Blank page under `/`: verify the image was built with `VITE_APP_BASE_PATH=/`.
- API calls go to localhost: verify `VITE_CONTROL_PLANE_API_BASE_URL` was set to an empty value for same-origin `/api` routing, or that any explicit public base URL is also allowed by the deployed CSP.
- Workflow options never finish loading: verify the image was built with `VITE_APP_DATA_MODE=control-plane`, `GET /api/v1/workspaces/{workspaceId}/workflow-options` returns `200`, and the deployed control-plane image includes the current workflow-options contract.
- Cross-origin workflow option requests fail: verify the control plane allows the exact console origin, enables credentialed CORS, and issues session/CSRF cookies with attributes compatible with that origin.
- Deep links return 404: verify nginx SPA fallback handles root-level application routes.
- Custom language missing from settings: verify `/locales/manifest.json` is valid and every file-backed language JSON exists under `/locales/`.
- Stale UI after deploy: verify `/` and `/index.html` return `Cache-Control: no-cache`, while hashed `/assets/...` files return immutable cache headers.
- Sign-in configuration unavailable: verify `GET /api/v1/auth/config` is
  reachable and returns the expected flags. The console intentionally enables
  no fallback authentication method.

## Browser Incident Support

1. Record the generated browser incident ID and occurrence time.
2. Record the control-plane request ID when the structured record contains one.
3. Search control-plane logs by request ID, then correlate by time and route
   path. Do not collect tokens, bodies, or URL query strings.
4. If no request ID exists, reproduce using the route path and browser version.

Centralized browser error reporting is deliberately deferred. Incidents exist
only in the affected browser console, so support depends on user-provided IDs;
this remains an operational risk until a privacy-reviewed reporting path exists.

## Required Validation

Before release or deployment chart changes:

```bash
npm run validate
```

The production-readiness release gate uses Node 22 and a clean install:

```bash
npm ci
git diff --check
npm run lint
npm run test
npx playwright test --config=playwright.fixtures.config.ts --retries=0 --repeat-each=3
npx playwright test --config=playwright.mcp-parity.config.ts --retries=0 --repeat-each=3
VITE_APP_DATA_MODE=control-plane npm run validate:ci
npm run smoke:nginx
```

For production image or nginx config changes, also run:

```bash
npm run smoke:nginx
```
