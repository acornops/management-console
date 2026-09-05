# Workspace MCP registry removal

## Goal

Remove workspace-owned MCP registry browsing, source administration, and
catalog import/reimport from Management Console while preserving direct MCP
registration, connection management, and the existing installed-server catalog.

## Constraints

- Keep the **Add MCP server** action menu in Agent, Kubernetes, and VM MCP
  catalogs.
- Show **Add from registry** as a disabled, accessible **Coming soon**
  placeholder with no route or API behavior.
- Keep **Connect by URL** and every current credential flow unchanged.
- Keep catalog terminology for installed MCP server collections.
- Leave control-plane and llm-gateway catalog endpoints and storage intact for
  future Platform Admin Console ownership.
- No legacy route redirect or catalog-provenance compatibility UI is required.

## UX acceptance criteria

- The add menu opens with the direct URL action focusable and actionable.
- The registry placeholder is visibly disabled, is excluded from menu keyboard
  navigation, exposes disabled semantics, and cannot navigate or mutate state.
- Workspace settings no longer expose MCP registry source management.
- `/workspaces/:workspaceId/catalog` resolves through the normal not-found
  route.
- Legacy provenance fields, if returned by the API, are ignored and the server
  remains manageable as an ordinary installed server.

## Contract boundary

- Management Console no longer calls catalog source, artifact, import, or
  reimport endpoints.
- Connection and OAuth operations live in a focused MCP connection client.
- The mirrored control-plane/Management Console contract records the dormant
  registry boundary while preserving producer-side artifact, import, and
  provenance contracts for future Platform Admin Console ownership.

## Validation log

- `VITE_APP_DATA_MODE=control-plane npm run validate`: UI package, design,
  adoption, typecheck, unit, membership, contract, harness, production build,
  and bundle stages passed through the final route-smoke stage. The separately
  captured `npm run smoke:routes` result passed.
- `npm run test -- --reporter=dot`: 207 files and 1,021 tests passed after
  adding the direct MCP credential-mode matrix and route-contract guard.
- Focused fixture Playwright: six checks passed across the disabled registry
  placeholder, active direct URL dialog, Agent/Kubernetes/VM add actions,
  removed workspace settings surface, former route not-found behavior, and
  remaining discovery geometry.
- `npm run design:snapshots`: 25 checks passed with one intentional skip after
  making the generic catalog example product-neutral and refreshing the four
  current-platform baselines.
- `npm run smoke:mcp-parity`: all eight Agent/target credential and capability
  parity checks passed.
- Management Console and control-plane `npm run contracts:check`: passed.
- Control-plane `npm run harness:check`: passed.
- Workspace `node scripts/harness/check-platform-contracts.mjs`: passed.
- `npx impeccable --json --fast src`: no cleanup-specific finding; the scanner
  retains one pre-existing `styles.css` token-parser warning for
  `Theme('Fontfamily.Mono')`.
- `git diff --check` in Management Console and control-plane: passed.

## Completion

- Removed pages, routes, fixture state, source/artifact service calls,
  provenance rendering, stale documentation, catalog-browser tests, route
  coverage entries, and 15 obsolete Linux route baselines.
- Preserved direct MCP registration, every supported credential mode,
  connection/OAuth management, installed-server catalog terminology, and
  platform-provided server management.
- Preserved the backend catalog producer endpoints and storage for future use.
- Added durable checks preventing the removed route state, pages, settings
  component, fixture router, API client, and endpoint calls from reappearing in
  Management Console.
