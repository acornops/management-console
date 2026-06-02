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
- Deep links return 404: verify nginx SPA fallback handles root-level application routes.
- Custom language missing from settings: verify `/locales/manifest.json` is valid and every file-backed language JSON exists under `/locales/`.
- Stale UI after deploy: verify `/` and `/index.html` return `Cache-Control: no-cache`, while hashed `/assets/...` files return immutable cache headers.

## Required Validation

Before release or deployment chart changes:

```bash
npm run validate
```

For production image or nginx config changes, also run:

```bash
npm run smoke:nginx
```
