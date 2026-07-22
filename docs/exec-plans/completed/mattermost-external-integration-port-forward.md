# Mattermost External Integration Port Forward

## Goal

Port Ryan Goh's four cumulative management-console pull requests (#12, #13,
#14, and #16) onto the current console through `temp-main`, preserving the
original commits while implementing the external integration controls inside
the newer route, catalog, workflow, target, authentication, and data layers.

Central tracking: acornops/acornops#12.

## Constraints

- Merge existing PR commits; do not squash, rebase, cherry-pick, or force-push.
- Preserve the current component and routing architecture, unified catalog and
  workflow surfaces, OIDC logout behavior, validated AI return paths,
  optimistic run handling, responsive design system, and refactored tests.
- Do not restore obsolete whole-page implementations from the old branches.
  Re-express grants, webhook controls, delivery status, and write-run UX as
  focused additions to current screens and services.
- Consume only control-plane endpoints documented in the synchronized contract
  manifest. Keep authorization errors and unavailable capabilities explicit.
- Validate both control-plane data mode and responsive browser behavior.

## Wave Scope

1. External account linking and workspace grant management.
2. Workflow/session access and webhook connection management.
3. Durable issue delivery lifecycle and status/history visibility.
4. Write-run execution and approval interaction.

## Decision Log

- 2026-07-22: `temp-main` was created from management-console `main` at
  `0e052aa`.
- 2026-07-22: Existing PRs remain the integration vehicles for original commit
  attribution.
- 2026-07-22: Current UI architecture and contracts win every conflict; legacy
  PR screens are design references, not authoritative replacements.
- 2026-07-22, Wave 1: Kept the current lazy-loaded account route and
  `ExternalIntegrationLinkRouteScreen`. Workspace grant selection was added to
  those current surfaces; the deleted legacy account-page test was not
  restored.
- 2026-07-22, Wave 1: Extracted linked-integration grant management from
  `UserSettingsPage` into a focused feature component and shared grant
  normalizer. Capability dependencies fail closed against the server-provided
  grantable set, unlink uses the current accessible inline-confirmation
  primitive, and all new account-settings copy is localized.
- 2026-07-22, Wave 1: Synchronized the vendored public-operation inventory with
  the generated control-plane OpenAPI contract, including the link-grant PATCH
  operation.
- 2026-07-22, Wave 2: Reconnected the webhook settings route to the current
  lazy-loaded settings shell. The older branch added a route case and path
  builder but omitted `webhooks` from the shared workspace-section matcher and
  from the mounted settings-page condition, leaving the advertised path at the
  not-found screen. Round-trip and browser fixtures now cover the real route.
- 2026-07-22, Wave 2: Preserved separate read and `manage_webhooks` access.
  Readers can inspect subscriptions, while create/update/delete and history
  remain capability-gated. The form explicitly creates workspace-wide
  subscriptions; existing target-scoped subscriptions remain visible and
  identifiable without inventing a target catalog interaction in this wave.
- 2026-07-22, Wave 2: Reworked the legacy monolithic webhook screen around the
  current `DataSurface`, `CollectionState`, `EmptyState`, `StatusBadge`, form,
  and inline destructive-confirmation primitives. All user-facing copy is
  localized, delivery dates use the shared user-time-zone formatter, and the
  one-time signing secret remains ephemeral component state.
- 2026-07-22, Wave 2: Webhook response parsing validates data at the API
  boundary and consumes the current `{ items }` contract. The final production
  sweep removed the unreleased older demo's bare-list compatibility path so
  contract drift fails visibly.
- 2026-07-22, Wave 2: Synchronized the vendored operation inventory with the
  generated webhook-route connect/status operations.
- 2026-07-22, Wave 3: Added issue created, reopened, and resolved events to the
  current typed webhook model. New webhook drafts select the issue-alert group
  by default, while the existing run, target-health, and workspace groups stay
  available through the current accessible editor.
- 2026-07-22, Wave 3: Adapted durable delivery history to the current
  `WebhookList` rather than restoring the older monolithic page. The API
  boundary now validates attempt and retry metadata and all five delivery
  states. History rows show attempt number, scheduled retry, HTTP result, and
  localized terminal reasons, including deliberate stale-issue suppression.
- 2026-07-22, Wave 4: Kept the current refactored external-integration settings
  panel as the capability editor. Read-write workflow grants now use the shared
  dependency-safe normalizer, localized account-settings copy, and a readable
  fallback for server-provided capabilities instead of restoring the older
  monolithic account implementation or maintaining a duplicate helper.
- 2026-07-22, Wave 4: Added exact run and approval deep links to the current
  approval inbox while retaining its `CollectionState`, aggregate pending
  count, permission checks, and recent-decision model. Focused links request
  `status=all`, hide unrelated status controls, highlight the selected row, and
  provide explicit not-found feedback.
- 2026-07-22, Wave 4: Synchronized the vendored public-operation inventory with
  the generated workflow-execution SSE contract.
- 2026-07-23, production sweep: Removed the unreleased bare-array webhook list
  fallback so the console fails visibly on control-plane contract drift instead
  of silently accepting two response shapes.
- 2026-07-23, production sweep: Kept transient link-completion failures on the
  localized retry screen and reserved expiry navigation for explicit 410 or
  expiry error codes. Capability labels, approval sources, empty values, and
  completion errors are localized; long identifiers and errors wrap safely.
- 2026-07-23, production sweep: Serialized external-integration settings
  mutations with both rendered disabled state and same-tick ref guards. Grant
  saves apply the returned link directly, avoiding a redundant refresh and
  preventing concurrent save/unlink races while preserving the newer settings
  architecture.

## Validation Log

- Baseline: design checks, TypeScript, and 587 unit tests passed in
  control-plane data mode. The real-Chrome design suite passed 19 tests in the
  combined run; the interrupted final existing case passed independently.
- Wave 1 console: design checks, TypeScript, 592 unit tests, membership,
  contracts, harness, production build, and route smoke passed in control-plane
  data mode. The real-Chrome design run again passed 19 tests before the known
  combined-run teardown stall; its remaining desktop case passed independently.
  The fixture suite passed all 123 repeated cases and the MCP parity suite all
  21 repeated cases when run with one worker, avoiding the same runner teardown
  problem without reducing repetitions.
- Wave 2 console: design-system, TypeScript, all 602 unit tests, membership,
  contracts, harness, production build, and route smoke passed. The real-Chrome
  design suite passed 19 tests with its one intentional skip. The pre-existing
  repeated fixture suite passed all 123 cases with one worker, the MCP parity
  suite passed all 21 repeated cases, and a post-route-fix full fixture pass
  passed all 43 current cases. Dedicated webhook browser coverage verifies the
  real route, history, focused inline deletion confirmation and cancellation,
  create flow, and one-time signing-secret display.
- Wave 3 console: design-system, TypeScript, all 606 unit tests, membership,
  synchronized contracts, harness, production build, and route smoke passed.
  The real-Chrome design suite passed 19 tests with its one intentional skip.
  The repeated fixture suite passed all 129 cases with one worker and the MCP
  parity suite passed all 21 repeated cases. Webhook browser coverage now
  verifies successful and superseded durable history, the stale-issue
  explanation, deletion confirmation, create flow, and one-time secret.
- Wave 4 console: design-system, TypeScript, all 609 unit tests, membership,
  synchronized contracts, harness, production build, and route smoke passed.
  The real-Chrome design suite passed 19 tests with its one intentional skip.
  The repeated fixture suite passed all 129 cases with one worker and the MCP
  parity suite passed all 21 repeated cases. Focused grant, approval API, and
  route tests passed all 43 cases.
- Production sweep: design-system and TypeScript checks passed; all 610 unit
  tests passed. Real-Chrome design coverage passed 19 cases with one intentional
  skip. The repeated fixture suite passed all 129 cases and MCP parity passed
  all 21 cases with one worker, avoiding the environment's two-worker teardown
  stall without reducing repetitions. Membership, synchronized contracts,
  harness, production build, route smoke, and the production dependency audit
  all passed.
- Each wave: run focused component/service tests, contract checks, design-system
  checks, control-plane-mode validation, production build, and route smoke.
- Final: verify linking, grants, webhook lifecycle, executions, SSE status, and
  approvals against the integrated control plane and Mattermost bot.

## Completion Criteria

- PRs #12, #13, #14, and #16 are merged with merge commits into `temp-main` in
  order, with Ryan's commits reachable.
- Current console behavior and design invariants remain green.
- A draft `temp-main` to `main` PR is ready for manual review and not
  automatically merged.
