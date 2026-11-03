# Pod log failure guidance

Scope: a presentation-only follow-up to the console UX audit. No agent, API,
authorization, polling, log request, or VM changes.

The live demo reproduces a generic agent error for nginx waiting in
ImagePullBackOff. Current AgentK and control-plane source already classify the
specific Kubernetes waiting-container response as POD_LOGS_UNAVAILABLE. The
deployed classification failure is not established; direct unauthenticated API
navigation cannot inspect the signed-in app response.

## Implementation

- [x] Add regression coverage before implementation.
- [x] Preserve the known POD_LOGS_UNAVAILABLE code in drawer state and present it
  as a neutral unavailable state with startup/refresh guidance.
- [x] On a failed log request, show the selected container's latest reported
  waiting state as context, independently of the request error. Never infer the
  request failure from a pod snapshot or reclassify generic/permission/offline
  errors. Previous-container requests retain their own errors.
- [x] Link to existing container details; keep request, follow, stale-log and
  success behavior intact. Localize English and Chinese.
- [x] Run affected browser tests, console validation and independent review.

No deployment is included. This improves the UI for both the existing typed
response and the observed generic failure, without claiming to repair an
unverified deployed backend/version issue.

## Verification (2026-11-03)

Console worktree: `fix/console-ux-clarity`, following `cd7ac27`.

- Regression red: `FIXTURE_APP_PORT=4192 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/log-investigation.spec.ts --grep 'pod waiting to start' --retries=0`
  failed before implementation because the neutral notice and guidance were absent.
- `FIXTURE_APP_PORT=4192 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/log-investigation.spec.ts --grep 'pod|following|container' --retries=0`
  passed all 13 targeted browser tests, including startup recovery, permission and
  offline failures, sibling-container exclusion, previous logs, stale output,
  follow limits/races, keyboard focus and Chinese mobile layout.
- `FIXTURE_APP_PORT=4192 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/log-investigation.spec.ts --grep 'pod waiting to start|pod waiting snapshot preserves AGENT_TOOL_ERROR|pod startup guidance' --retries=0`
  passed 3 final visual checks. English startup/generic error and Chinese narrow
  screenshots inspected; no clipping found.
- `VITE_APP_DATA_MODE=control-plane npm run validate` passed: 1,336 tests plus
  design/adoption, types, membership, contracts, harness, build, bundle and route checks.
- In control-plane: `NODE_ENV=test node --import tsx --test test/kubernetes-pod-logs.test.ts`
  passed 6 tests, unchanged code.
- In AgentK: `npm test -- src/tools/atomic/get-resource-logs.spec.ts src/mcp/router.spec.ts`
  passed 60 tests, unchanged code.
- Independent read-only review: approved, no must-fix findings.
- `git diff --check` passed.

`validate:full`, unrelated browser suites and full backend validation were not
run for this localized console presentation change. No API/agent contracts,
permissions, migrations, dependencies or request behavior changed. Source
changes are limited to the drawer and three strings in each locale.

Residual limitation: the live generic response's backend/deployment cause is
unverified. The UI keeps that actual error and adds current snapshot context;
it does not claim the snapshot caused the failure. Nothing was deployed.
