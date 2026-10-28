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

## MCP tool search and Agent appearance

Manage Tools searches tool names and displayed labels. Starting a search completes the existing paged
discovered-tool read before reporting complete results. Failed reads retain known
tools, label results incomplete and offer Retry. Unfiltered browsing stays paged.
The Enabled tools summary remains the server-reported
effective count, not an unsaved-draft count. Group switches apply to every tool
in their capability group, including tools hidden by a filter, and show the full
group count.

Clear search keeps edits. Reset changes clears only edits, not discovered tools
or the search. A failed save retains the remaining draft for another Save changes
attempt. Agent appearance is optional and collapsed by default in Agent
definition settings; the selected emoji remains visible while its picker is
collapsed. Agent owner selection uses the existing dropdown with Load more for
additional member pages; there is no separate owner search field.

## Bounded log investigation

Kubernetes pod logs retain their container, previous-container, tail and polling
Follow controls. Search logs highlights only the loaded output and preserves the log
viewport; Paused stops polling, not the workload. Fetched time includes the
user's timezone and is distinct from timestamps reported inside log entries.

With the matching AgentK and Control Plane updates, a container waiting to start
shows "No logs yet; this container has not started." Resolve its startup issue
and use Refresh once it starts. Other read failures retain their existing error
handling; this message does not mean the agent connection failed.

VM Logs use a bounded on-demand agent query, not a live stream. Search logs filters only loaded
entries. Entry timestamps use the user's timezone; missing timestamps and
unavailable collection times remain explicitly unknown. Refresh failures retain
previously loaded output with stale feedback in both viewers.

The Copy and Download icon buttons beside Search logs export the entire loaded output, not
only search matches or additional history. Tooltips and accessible labels identify
both actions. Exports include source and scope context,
use the same authorized fields shown in the viewer, and make no extra log read.
Logs can contain sensitive application output: review before sharing. The console
does not persist these exports or send their contents to analytics. Clipboard
permission failures are shown inline and downloading remains a deliberate action.

Historical range queries, retention controls and cross-source search are outside
these viewers. A future history feature needs a separately reviewed producer
contract for authorization, time bounds, result limits and redaction; this UI does
not infer history support from the existing diagnostic reads.

## Required Validation

Before release or deployment chart changes:

```bash
npm run validate:full
```

The production-readiness release gate uses Node 22 and a clean install:

```bash
npm ci
git diff --check
VITE_APP_DATA_MODE=control-plane npm run validate:ci
npm run smoke:nginx
```

`validate:ci` runs the non-browser preflight checks before the browser gate. Each
browser test runs once per invocation. GitHub Actions fans the browser suites
and design-route projects out only after preflight passes; the release workflow
uses the same two gates sequentially before building an image.

For production image or nginx config changes, also run:

```bash
npm run smoke:nginx
```

## UI Package Releases

`@acornops/ui` is a private package published to
`https://npm.pkg.github.com`. Package changes require a Changeset. A merge to
`main` causes `.github/workflows/release-package.yml` to open or update the
Changesets release pull request; merging that pull request publishes with the
workflow `GITHUB_TOKEN`.

The initial minor Changeset versions the package from `0.0.0` to `0.1.0`.
Package publishing does not create a Management Console image tag and the
tag-driven image release does not publish the npm package.

The workflow grants write access only to repository contents, pull requests,
and packages. It uses no repository-stored npm credential.

Workspace suspension requires the member access-state control-plane endpoints before console rollout. A suspended workspace remains in the directory with a safe public explanation. Idle tabs recheck every 15 seconds; HTTP and stream suspension responses trigger immediate revalidation. Refresh access starts a fresh overview after restoration without replaying old actions.
