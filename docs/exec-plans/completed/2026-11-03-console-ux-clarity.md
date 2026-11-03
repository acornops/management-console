# Console UX clarity

## Scope and decisions

Implement the approved UX audit follow-up: readable approval actors and targets,
separate decision/execution states in existing cells and mobile cards, accurate
assigned-tool counts, and bounded localized VM log timestamps. Preserve IDs in
review with explicit copy controls. Keep permission enforcement and pod logs
unchanged. No new approval table columns.

Approval fields are additive and optional. The control-plane producer enriches
authorized projections; the console never fetches a user directory to resolve
names. Missing names retain IDs; missing execution status reads Unknown.

Workflow policy remains separate from tool classification. The summary reports
read, write, and unknown counts and retains incomplete-agent warnings. VM logs
use shared date/time formatters and timezone conventions with explicit lines and
safe wrapping; raw Kubernetes log rendering is unchanged.

## Work and validation

- [x] Reproduce missing names and unknown outcomes with failing render tests.
- [x] Implement shared approval identity/outcome rendering and optional DTO fields.
- [x] Correct workflow summary and VM timestamp layout with focused tests.
- [x] Complete affected browser checks, full repository validation, and independent review.
- [x] Verify added approval counterpart fields and record existing platform-check gaps.

Run approval-outcomes and approval-review fixture tests for desktop/mobile
identities, independent outcomes, scope isolation, and decision safety. Run
workflow/log fixture coverage for tool classification, long sources, localized
timestamps, and grid alignment. Run `VITE_APP_DATA_MODE=control-plane npm run validate`
and the workspace platform-contract checker after targeted tests.

## Rollout

Related control-plane branch: `fix/console-ux-clarity`. Merge/deploy its additive
approval projection first, then the console. No schema migration is required.
This work does not deploy the demo or change its operational settings.

## Pod-log investigation

Existing AgentK classification recognizes Kubernetes HTTP400 waiting-container
errors and preserves a structured `ContainerNotStarted` reason through MCP.
The control plane maps it to HTTP409 `POD_LOGS_UNAVAILABLE`; console copy already
exists. Current focused AgentK and control-plane regressions pass. The demo
failure still requires deployment/version and response-envelope tracing before
its cause is established. A scoped explanatory UI state can reuse this code;
adding a new resource-events destination is a separate, larger improvement.

## Verification evidence

- `VITE_APP_DATA_MODE=control-plane npm run validate`: PASS; 241 files, 1,336 tests; design/adoption/type checks, membership/contracts/harness, production build/bundle budget, and route smoke passed.
- `FIXTURE_APP_PORT=4192 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/approval-outcomes.spec.ts tests/fixtures/approval-review.spec.ts`: PASS, 31 tests. Final focused screenshot run passed 2 tests.
- `FIXTURE_APP_PORT=4191 npx playwright test --config=playwright.fixtures.config.ts --retries=0 --output=test-results/capability-log-ui tests/fixtures/log-investigation.spec.ts tests/fixtures/workflow-ux.spec.ts --grep 'VM timestamp|VM exports|390px|default workflows|capability inventory|primary navigation'`: PASS, 8 tests. Two screenshot cases cover English/Chinese at 1440, 900, 390 pixels and 200% text.
- Independent review: no findings. Final screenshot inspection confirms approval states and VM column containment.
- `git diff --check`: PASS.
- Workspace `node scripts/harness/check-platform-contracts.mjs`: FAIL on the same original-checkout gaps: agent-connection/Windows manifest drift and three missing Windows fixture/doc counterparts. Added approval contract fields match exactly; the set of baseline mismatches is unchanged.
- Original control-plane `npm run openapi:check` also reports pre-existing generated-document drift. Current branch API artifacts were generated separately for handoff; the original docs checkout was not overwritten.

`validate:full` was not run: affected browser specs provide the required visual coverage; the repository policy reserves the full browser matrix for broad changes/release readiness. No live deployment, write-action execution, or pod-log change was performed.
