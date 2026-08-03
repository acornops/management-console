# Impeccable 40/40 and Audit 20/20 Closure

## Goal

Resolve the full-app critique baseline phase by phase and reach a fresh,
evidence-backed Impeccable critique score of 40/40 and Impeccable audit score
of 20/20 without weakening product behavior, fixtures, validation, or design
standards.

Baseline findings are recorded in
[`management-console/docs/design-docs/impeccable-full-app-critique-2026-08-03.md`](../../design-docs/impeccable-full-app-critique-2026-08-03.md).

## Starting State

- Critique: 28/40.
- Cognitive-load checklist: 3 failures out of 8, moderate.
- Audit: 19/20. Accessibility, responsive design, theming, and anti-patterns
  score 4/4; performance scores 3/4 because the target-chat production chunk
  retains only 11.6 percent headroom below its enforced raw-size budget.
- Canonical visual manifest: 39 routes, with valid production routes and
  important route-backed states omitted.
- Previous audit work explicitly left two P1 issues unresolved, light-theme
  accent contrast and narrow-screen Assistant composer behavior. This plan
  re-evaluates and closes both rather than inheriting that exclusion.

## Route and State Coverage Matrix

This matrix reconciles the typed production surface in `src/utils/routes.ts`
with the canonical browser manifest in
`scripts/route-coverage-manifest.mjs`. `Covered` means the route currently has
its own manifest entry. `Gap` means the route or state needs a dedicated
manifest entry and route-specific readiness landmark before score closure.

| Owner | Production routes | High-risk states | Required evidence | Baseline |
| --- | --- | --- | --- | --- |
| Entry and support | `/`, `/workspaces`, `/help`, unknown paths | Signed-in home, workspace chooser, first-workspace empty state, Help, Not Found, anonymous login, restoring session, no auth method | Desktop/mobile, light/dark, keyboard, 200-percent text, explicit entry-state landmark | Login covered; signed-in Home, Workspaces, Help, Not Found, restoring, and disabled-auth are gaps |
| Invitation | `/invites/:token` | Valid invite, wrong signed-in account, expired or failed invite, accepting | Desktop/mobile, keyboard, error recovery, long identity | Valid invite covered; mismatch and failure recovery are gaps |
| External integration | `/integrations/external/link` | Approval, checking, linked, expired, cancelled, failure, long workspace list | Desktop/mobile, light/dark, keyboard, 200-percent text, terminal-state action | Linked covered; approval, loading, expired, cancelled, failure, and long-list states are gaps |
| Workspace orientation | `/workspaces/:id/overview`, `/workspaces/:id/kubernetes-clusters`, `/workspaces/:id/virtual-machines`, `/kubernetes-clusters` | Populated, empty, filtered-empty, initial loading, background refresh, failure, permission-restricted, high-count, long name | Route snapshots, fixture state suites, Axe, 200-percent text | Populated workspace routes covered; global cluster catalog and state variants are gaps |
| Catalog and agents | `/workspaces/:id/catalog`, `/workspaces/:id/agents`, agent capability query state | Search and filter, artifact focus, destination focus, incompatible destination, capability drawer, empty and high-count inventory | Route-specific drawer/detail landmark, desktop/mobile, keyboard, long content | Base routes and one capability query covered; artifact, destination, incompatible, empty, and high-count states are gaps |
| Automation | Workflows, Activity, Schedules, Incoming Webhooks, Outbound Webhooks | Workflow focus, run focus, create drawers, recommendation panel, empty/loading/failure, schedule and webhook repair | Drawer/detail landmark, desktop/mobile, keyboard, state-preserving error recovery | Base routes covered; focused, create, recommendation, empty/loading/failure, and repair states are gaps |
| Governance | Approvals and Audit Log | Focused approval, long translated decision, permission-restricted, destructive action, advanced filters, filtered-empty | 320-390 pixel completion, keyboard, 200-percent text, focus landmark | Base routes covered; focused approval and state variants are gaps |
| Workspace settings | Members, AI Settings, Workspace Settings root, MCP registry deep link | Pending invitations, limited permission, dirty/saved AI state, Assistant return context, destructive/leave state, deep-linked registry | Route-specific section landmark, desktop/mobile, keyboard, 200-percent text | Members, AI Settings, and registry deep link covered; Settings root, Assistant return, permission, dirty, and destructive states are gaps |
| Account settings | `/account` | Security controls unavailable, long provider identity, mutation success/failure | Desktop/mobile, keyboard, recovery | Base route covered; state variants are gaps |
| Agent detail | Chat, MCP Servers, Skills, Tools, Settings | New chat, existing session, long transcript, active run, empty capability inventory, dependency failure, disable/delete consequence | Desktop/mobile, keyboard, 200-percent text, long content, route-specific session landmark | Base routes and one chat state covered; explicit new/existing session, long, failure, and destructive states are gaps |
| Kubernetes detail | Overview, Resources, Health, MCP Servers, Skills, Tools, Chat, Settings, workspace-scoped aliases | Thin/history telemetry, empty/loading/failure, long resource names, capability dependency failure, new/existing chat session, auto-triage failure | Desktop/mobile, light/dark, keyboard, 200-percent text, long content | All base routes except Health covered; state variants and workspace-scoped non-chat aliases are gaps |
| Virtual machine detail | Overview, All Resources, Services, Processes, Network, Logs, MCP Servers, Skills, Tools, Chat, Settings | Thin/history telemetry, empty/loading/failure, long process/service/log content, capability dependency failure, new/existing chat session | Desktop/mobile, light/dark, keyboard, 200-percent text, long content | Overview, Resources, capabilities, Chat, and Settings covered; Services, Processes, Network, Logs, and state variants are gaps |

Cross-cutting evidence ownership is explicit:

- Every canonical route runs in desktop light, desktop dark, mobile light,
  mobile dark, and constrained-sidebar projects.
- Desktop light owns WCAG 2.1 AA automation and 200-percent text reflow for
  every canonical route.
- The focused forced-colors test owns keyboard focus visibility under forced
  colors and reduced motion; route-level keyboard completion tests own complex
  approval, drawer, menu, and Assistant interactions.
- Fixture suites own initial loading, background refresh, failure,
  permission, destructive, long-content, and high-count variants that cannot
  be represented by a stable URL alone.
- Each manifest entry must wait for a route-specific landmark or the intended
  overlay state. A generic `h1` proves only shell arrival and is not sufficient
  for focused routes or drawers.

## Constraints

- Preserve the Operator's Ledger design language in `PRODUCT.md` and
  `DESIGN.md`.
- Preserve URL-backed navigation, shareable workspace and target context,
  browser history, permissions, and resumable deep links.
- Preserve the control-plane API boundary and all public or cross-repository
  contracts.
- Preserve WCAG 2.1 AA, keyboard operation, visible focus, reduced motion,
  forced-colors behavior, and 200-percent text reflow.
- Preserve English and Chinese localization behavior. Do not hardcode new
  production copy in components.
- Preserve production bundle budgets, async-state continuity, observability,
  and repository file-size rules.
- Preserve all pre-existing user changes in the dirty worktree. Do not revert,
  overwrite, stage, commit, or publish unrelated work.
- Do not game scores by suppressing rules, weakening fixtures, hiding content,
  removing useful functionality, or blindly updating snapshots.
- Do not commit, push, or open a pull request unless separately requested.

## Phase 0: Establish Complete Baselines

1. Run a fresh Impeccable critique and audit before implementation.
2. Record the exact critique and audit rubric scores and every actionable
   finding.
3. Reconcile `src/utils/routes.ts` with
   `scripts/route-coverage-manifest.mjs`.
4. Add an explicit route-and-state coverage matrix for production pages,
   query-backed drawers, focused states, empty/loading/error/permission states,
   themes, desktop/mobile layouts, 200-percent text, and long content.
5. Confirm which detector findings are genuine and which are reproducible
   parser limitations.

Exit gate: every production route and high-risk state has an owner and a
planned evidence surface, and both score baselines are recorded.

## Phase 1: Restore Mobile Task Completion

1. Redesign Approvals for narrow screens as labeled stacked decision rows.
2. Keep approval consequences and Approve or Reject actions visible without
   horizontal scrolling.
3. Redesign Cluster, VM, and Agent chat composer controls for 320 to 390 pixel
   widths.
4. Preserve message width, run-detail readability, attachment access, runtime
   selection, capability preview, and send actions.
5. Re-evaluate the persistent chat rail at narrow widths.
6. Add regression coverage for mobile, 200-percent text, keyboard access, and
   long translated content.

Exit gate: the primary governance and chat tasks complete at supported narrow
widths with no overflow, clipping, obscured action, or lost context.

## Phase 2: Close Recovery and Journey Dead Ends

1. Add account-switch or sign-out recovery to invitation mismatch states.
2. Add explicit return, retry, close, or destination actions to external-link
   linked, expired, cancelled, loading, and failure states.
3. Give the disabled-auth login state a useful retry or diagnostic path.
4. Replace raw schedule, webhook, and capability dependency codes with concise
   cause, impact, repair, retry, and optional technical-detail anatomy.
5. Make cluster auto-triage recovery specific and actionable.
6. Preserve form and route state during recoverable errors.

Exit gate: every error or terminal entry state has one obvious safe next action
and no required context is lost during recovery.

## Phase 3: Reduce Cognitive and Visual Load

1. Convert the Agent card grid to a scalable comparison surface or prove the
   grid is the better affordance at supported inventory sizes.
2. Remove zero-value and non-decision-changing capability summary metrics.
3. Consolidate duplicate VM waiting states and thin-evidence charts.
4. Simplify Audit Log time and advanced filter disclosure.
5. Clarify ambiguous actions such as View More and normalize inbound versus
   outbound webhook naming.
6. Reorder MCP Catalog decisions so destination selection matches the stated
   task sequence.
7. Preserve operational density where it materially improves scan speed.

Exit gate: the cognitive-load checklist has zero failures and the revised
surfaces retain or improve expert scan speed.

## Phase 4: Complete Route and State Design Coverage

1. Cover Help, Home/Workspaces, Not Found, Workspace Settings root, VM Services,
   Processes, Network, Logs, Kubernetes Health, and external-link outcomes.
2. Cover focused approvals, create drawers, assistant sessions, AI return
   context, and catalog artifact or destination states.
3. Cover populated, empty, filtered-empty, initial-loading, background-refresh,
   failure, permission, destructive, long-content, and high-count variants.
4. Run every relevant route in light and dark themes, desktop and mobile
   layouts, constrained sidebar, reduced motion, forced colors, and
   200-percent text where the harness supports them.
5. Wait for the actual route-specific landmark or overlay state, not only a
   generic page heading.
6. Inspect visual changes before accepting any updated baseline.

Exit gate: the manifest and browser suites accurately claim full production
route and high-risk-state coverage.

## Phase 5: Score Closure and Release Evidence

1. Re-run Impeccable critique and fix the highest-severity remaining finding.
2. Re-run Impeccable audit and fix the highest-severity remaining finding.
3. Repeat until both rubrics reach the target or an honest external blocker is
   proven.
4. Run targeted tests during each phase.
5. Run the repository design checks and full browser validation after broad
   route changes settle.
6. Run `VITE_APP_DATA_MODE=control-plane npm run validate`.
7. Run `npm run validate:full` because this is a broad, high-risk, release-level
   UI and browser-harness change.
8. Record exact commands, results, screenshots, skipped checks, docs impact,
   residual risks, and any unrelated failure evidence.

Exit gate: fresh critique is 40/40, fresh audit is 20/20, no actionable finding
remains, and full repository validation passes.

## Verification Commands

Use repository-appropriate targeted commands while iterating. The final
evidence set must include:

- `npx impeccable --json src`
- `npx impeccable --json packages/ui/src`
- A fresh Impeccable critique across the completed route/state inventory.
- A fresh Impeccable audit across the completed route/state inventory.
- `npm run design:check`
- `npm run design:adoption`
- `npm run design:snapshots`
- `npm run design:routes`
- `npm run smoke:fixtures`
- `npm run smoke:mcp-parity`
- `VITE_APP_DATA_MODE=control-plane npm run validate`
- `npm run validate:full`

If the current Impeccable CLI exposes different command syntax, discover and
record the installed command surface before using the equivalent commands.

## Completion Criteria

- Critique is exactly 40/40 on a fresh post-change run.
- Audit is exactly 20/20 on a fresh post-change run.
- The eight-item cognitive-load checklist has zero failures.
- No P0, P1, P2, or P3 critique finding remains unresolved.
- No actionable deterministic detector finding remains unresolved.
- Every production route and high-risk route-backed state has inspectable
  source and rendered evidence.
- Mobile, desktop, light, dark, keyboard, reduced-motion, forced-colors,
  200-percent text, and long-content checks pass where applicable.
- Route behavior, contracts, permissions, i18n, observability, async
  continuity, and bundle budgets remain intact.
- Snapshots represent inspected improvements rather than accepted drift.
- Final validation evidence is recorded in this plan.

## Iteration Policy

After every critique, audit, test, or browser run:

1. Record the new evidence.
2. Select the highest-severity reproducible finding.
3. Fix the smallest shared cause that resolves it across all affected routes.
4. Add or strengthen regression coverage.
5. Re-run the narrowest meaningful check before expanding validation.

Do not move to a later phase while a P1 issue in the current phase remains.
Lower-severity work may be grouped only when it shares the same root cause.

## Blocked Stop Condition

Stop without claiming completion when:

- the scoring tool or rubric cannot be executed or its result cannot be
  reproduced;
- a required control-plane behavior or contract is unavailable;
- a pre-existing user change overlaps the required implementation and cannot
  be preserved safely;
- the only path to a target score would weaken usability, accessibility,
  security, observability, fixtures, coverage, or product behavior; or
- three evidence-backed attempts leave the same blocking condition unresolved.

Report the attempted paths, exact commands and outputs, confirmed progress,
remaining findings, blocker, and specific user or external input needed to
continue.

## Copy-Ready Codex Goal

```text
/goal Resolve every finding in management-console/docs/design-docs/impeccable-full-app-critique-2026-08-03.md phase by phase and reach a fresh Impeccable critique score of 40/40 and Impeccable audit score of 20/20, verified by complete production route-and-state critique and audit evidence, deterministic scans, inspected desktop/mobile and light/dark browser results, WCAG 2.1 AA and 200-percent text checks, VITE_APP_DATA_MODE=control-plane npm run validate, and npm run validate:full, while preserving the Operator's Ledger design language, URL-backed navigation, control-plane contracts, permissions, i18n, observability, async continuity, performance budgets, repository harness rules, and all pre-existing user work. Use management-console/docs/exec-plans/active/impeccable-40-audit-20-closure.md as the execution contract; work only in management-console, do not suppress rules, weaken fixtures, hide useful content, blindly accept snapshots, or commit or publish unless separately asked. Between iterations, record the latest evidence, select the highest-severity reproducible finding, fix the smallest shared cause across every affected route, strengthen regression coverage, and rerun the narrowest meaningful check before expanding validation. Do not leave the current phase while a P1 remains. If the scoring tools cannot run, a required contract is unavailable, pre-existing work cannot be preserved safely, the target would require weakening quality, or the same blocker survives three evidence-backed attempts, stop without claiming completion and report attempted paths, exact evidence, remaining findings, the blocker, and the specific input needed to continue.
```

## Validation Log

### 2026-08-03: Phase 0 baseline and Phase 1 mobile task completion

- Independent post-change critique assessment: 28/40, with three cognitive
  load failures out of eight. The mobile Approvals and Assistant P1 was
  confirmed resolved in the live worktree; entry/integration recovery and
  operational recovery remain the highest-severity findings.
- Independent Impeccable technical audit: 19/20. Five high-risk browser views
  returned zero Axe WCAG 2.1 A/AA violations, console errors, page errors, or
  reflow overflow. The remaining point is performance headroom, not a failing
  budget.
- `npx impeccable --json src`: exit 2 with one confirmed parser false positive
  for `theme('fontFamily.mono')` in `src/styles.css`. The Tailwind preset
  resolves it to the documented Ubuntu Mono stack.
- `npx impeccable --json packages/ui/src`: pass, empty result.
- `npx vitest run src/pages/WorkspaceApprovalsPage.test.ts src/features/targets/chat/components/TargetChatView.polish.test.ts`: pass, 7 tests.
- `npm run app:typecheck`: pass.
- `DESIGN_ROUTES_REUSE_SERVER=1 npx playwright test --config=playwright.design-routes.config.ts --project=mobile-light --grep='mobile approvals and Assistant controls'`: pass. The test owns 320-pixel Approvals and Agent, Kubernetes, and VM Assistant keyboard focus, visible decisions, 44-pixel touch targets, trailing Send placement, root and internal overflow, and 200-percent text reflow.
- `DESIGN_ROUTES_REUSE_SERVER=1 DESIGN_ROUTE_NAMES=workspace-approvals,agent-chat,cluster-chat,vm-chat npx playwright test --config=playwright.design-routes.config.ts --project=mobile-light --grep='all canonical routes satisfy'`: pass against inspected 390-pixel mobile baselines.
- Production build, app/shared-UI typechecks, the 444-file design-system check,
  design adoption, and bundle budgets passed during the independent technical
  audit. The largest chunk was target chat at 316,849 of 358,400 bytes.

Phase status:

- Phase 0 exit gate met: both score baselines are recorded, typed route and
  manifest gaps are reconciled in the coverage matrix, and every route/state
  family has an evidence owner.
- Phase 1 exit gate met for the English fixture inventory: mobile decisions
  and Assistant actions complete at 320 and 390 pixels without clipping,
  overflow, or lost actions. Chinese long-copy browser coverage still belongs
  to the final cross-cutting route/state expansion rather than this narrow
  regression.

### 2026-08-03: Phase 2 recovery and journey continuity

- Wrong-account invitations now provide a primary account-switch action. The
  logout boundary accepts only a validated encoded `/invites/:token` path,
  preserves it in session storage across identity-provider redirects, and
  restores it without accepting arbitrary post-logout destinations.
- Linked, expired, cancelled, and unavailable external-integration outcomes
  now have status-specific headings, explanations, and explicit Close, Retry,
  or Return to AcornOps actions. Approval failures relabel the primary action
  as Try linking again while preserving the reviewed grant draft.
- The disabled-auth login state now identifies the runtime configuration
  condition and provides a retry action backed by `useAuthConfig.retry`.
- Schedule and inbound-webhook failures now use compact Cause, Impact, and
  Next step anatomy. Raw control-plane messages remain available only in a
  Technical details disclosure; MCP schedule failures deep-link to the exact
  workflow-access repair surface.
- Failed automatic investigations now distinguish AI-provider setup, target
  disconnection, missing diagnostic tools, retryable service failures, and
  manual Assistant fallback. Existing control-plane `canRetry` authority is
  preserved.
- `npm run app:typecheck`: pass.
- Focused Vitest coverage for logout-path validation, invitations, auth
  recovery, external-link terminal actions, operational failure formatting,
  and automatic-investigation recovery: pass, 29 tests across the focused
  runs.
- Focused desktop-light browser interaction coverage for invitation switching,
  all four external-link terminal states, and auth-config retry: pass.
- Focused route snapshots for Login, Invitation, all four external-link
  outcomes, Schedules, incoming webhooks, and target overview surfaces passed
  across desktop light/dark, mobile light/dark, and constrained-sidebar
  projects. Desktop light also passed Axe WCAG 2.1 A/AA and 200-percent text
  reflow. Updated snapshots were visually inspected.

Phase status:

- Phase 2 exit gate met for the represented recovery states: every terminal
  entry state and operational failure has a safe visible next action, raw
  implementation codes no longer lead the operator-facing explanation, and
  recoverable route/form state is retained.
