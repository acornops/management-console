# Capability preview copy

## Scope

Restore the concise policy note in the chat capability popup. Keep the READ
explanation on the existing badge tooltip; shorten the approval sentences in
both bundled locales. Do not change colors, spacing, placement, scrolling,
permissions, or tool behavior.

The extra visible READ paragraph was introduced in `bad4249` on October 19,
2026, not in the subsequent compact-scrolling fix (`928c090`).

## Checks

- Add a browser regression proving the policy note follows the preview's
  approval state and the READ explanation remains on the badge, not duplicated
  above the list.
- Observe the regression fail before removing the paragraph.
- Run `npm run validate` and the focused capability browser checks, including
  long-list scrolling at desktop and compact sizes.
- Inspect the rendered popup; leave styling and bounded scrolling unchanged.

## Related VM diagnosis

Read-only demo traces show the latest restart used `active (running)` and a
made-up invocation ID, without first reading `get_service`. The helper refused
the request with `PRECONDITION_FAILED` and `outcome: not_started`. The connected
host is still on AgentV `.10`; the explicit read-before-restart tool guidance
is already published in `.13`. No additional runtime patch is justified by this
trace. Update AgentV's operations guide with the upgrade and safe retry steps;
do not upgrade the user's VM or trigger a service restart during this check.

## Validation

Implementation completed on `fix/capability-copy-restart-guidance`. Publication
and demo rollout are tracked separately in the private demo-infra release plan.

- Management Console: `npm run validate` passed, including 1,190 unit tests,
  type, design, translation/contract, build, bundle, and route-smoke checks.
- Browser regression: both new cases failed on the duplicated paragraph before
  the fix. `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/ui-polish-accessibility.spec.ts --grep 'capabilit'` then passed
  all 18 cases: approval states, keyboard behavior, bounded lists, 200 tools,
  Agent/Kubernetes/VM, full/quick chat, light/dark, and small/desktop viewports.
- Manually opened the local VM chat popup in the browser and confirmed the
  one-line policy note and Escape/focus restoration.
- AgentV: `npm run validate` passed (107 tests); `npm run test:e2e` passed
  (4 local mock tests). Existing helper tests cover correct preconditions,
  state races, formatted states, and invented invocation IDs.
- `git diff --check` passed in both repositories. Independent read-only review
  found no actionable issues.
- Local loopback listeners initially hit sandbox `EPERM`; the same checks
  passed with listener permission. Existing Browserslist age and terminal-color
  warnings are unchanged; no dependency changes were made for this copy fix.

Release preflight (`VITE_APP_DATA_MODE=control-plane npm run
validate:ci:preflight`) and AgentV validation passed again before publication.
The PR and release workflows enforce the full browser suites before publishing
an image. No application dependencies, backend contracts, or agent runtime code
changed.

Demo diagnosis used only read-only queries for agent version and relevant tool
events. No live service restart, VM upgrade, or model invocation was performed.
The installed VM agent must still be upgraded and the operation retried with
fresh observed preconditions; this check does not claim a successful live
restart. Source inspection confirmed the Control Plane and Execution Engine
preserve the `.13` tool descriptions, including the per-field guidance, and the
gateway forwards them to the model. A local check using the actual AgentV schema,
both sanitizers, and both OpenAI request builders confirmed those descriptions
and fields remain unchanged, without making provider or host calls.
