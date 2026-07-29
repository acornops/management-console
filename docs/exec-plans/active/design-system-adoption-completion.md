# Design-System Adoption Completion

## Goal

Finish design-system adoption across the production Management Console and
restore the tracked 20/20 score only after executable enforcement, shared UI
foundations, application migrations, route coverage, and the complete
control-plane-mode validation suite all pass.

## Baseline

- Work started from freshly fetched `origin/main` at
  `bff155f59c8eaab7f21c210675161c6124157c0e`.
- The isolated worktree is
  `/home/ning/acornops/.worktrees/management-console-design-system` on
  `chore/design-system-adoption-completion`.
- The existing `feat/agent-chat-workspace` worktree is intentionally untouched.
- The repository currently reports a 20/20 design-system score, but the score is
  treated as incomplete until this plan's final verification succeeds.
- The baseline checker contains source-pattern enforcement, while this plan
  requires an AST-based adoption contract and mutation proof.

## Scope

### Stage 0: Baseline and enforcement contract

- Add an AST-based `design:adoption` command over production application and UI
  package TypeScript/TSX.
- Reject application-native controls, low-level overlays, visible native
  tables, raw typography reconstruction, and local components shadowing public
  UI-package exports.
- Require exact reviewed exception metadata and reject temporary exceptions in
  final validation.
- Add mutation tests proving forbidden examples fail.

### Stage 1: Shared UI foundations

- Share modal isolation between dialogs and drawers, including focus trap and
  restoration, Escape handling, inertness, scroll locking, nesting, and reduced
  motion.
- Associate dialog descriptions through `aria-describedby`.
- Remove raw typography reconstruction from `@acornops/ui`.
- Add and export `DataTableBody`, `DataTableRow`, `DataTableCell`, and a typed
  `FileInput`.
- Update catalog coverage, tests, and the package Changeset.

### Stage 2: Overlay migration

- Replace application use of `Dialog`, `RightSidePanel`, and handmade dialogs
  with `DialogFrame`, `DrawerFrame`, or `DestructiveConfirmationDialog`.
- Preserve dimensions, content, pending-close behavior, initial focus, and
  destructive confirmation contracts.
- Add browser coverage for containment, dismissal, focus restoration,
  inertness, nesting, mobile overflow, dark mode, and 200% text.

### Stage 3: Controls and fields

- Migrate ordinary actions, navigation, tabs, filters, and menus to shared
  primitives.
- Rebuild `ThemeMenu` from the shared menu vocabulary.
- Replace native production inputs and textareas with `TextInput`, `Textarea`,
  `PageSearchInput`, or `FileInput`.
- Standardize label, help, invalid, and disabled states.

### Stage 4: Typography, tables, and duplicates

- Replace raw size and weight utilities with semantic typography roles.
- Convert visible application and chart-accessibility tables to complete
  `DataTable` composition.
- Keep only renderer-owned user Markdown tables as reviewed structural
  exceptions.
- Replace resource-explorer local shared-component copies and extend duplicate
  detection across production directories.

### Stage 5: Completion proof

- Centralize route coverage in one manifest shared by smoke and design-route
  tests.
- Cover every distinct workspace, automation, governance, settings, agent,
  Kubernetes, VM, login, invitation, and integration layout.
- Validate 1600px light/dark, 390px light/dark, and sidebar-constrained 1024px.
- Review all visual diffs before updating baselines.
- Require zero temporary exceptions and zero unexplained snapshot changes.
- Restore 20/20 only after final validation succeeds.

## Constraints

- Do not modify the dirty `feat/agent-chat-workspace` worktree.
- Preserve routes, permissions, control-plane contracts, and target behavior.
- Keep `Dialog` and `RightSidePanel` public for UI-package composition while
  prohibiting application use.
- Do not make cross-repository contract changes.
- Use conventional stage commits.
- Publish only with one fast-forward-only `git push origin HEAD:main`; never
  force-push and never open a pull request automatically.

## Acceptance Criteria

- `design:adoption` is AST-based, runs in normal and CI validation, and reports
  zero violations across every enforced category.
- Exception metadata is exact and reviewed; final validation contains no
  temporary exception.
- Shared overlays satisfy the keyboard, focus, isolation, nesting, overflow,
  theme, reduced-motion, and 200% text contract.
- Production application code contains no prohibited low-level overlays,
  native controls, visible native table anatomy, raw typography
  reconstruction, or local shadows of UI-package components.
- The shared route manifest drives smoke and design-route coverage at all
  required layouts.
- UI package, design, unit, browser, fixture, parity, contract, harness, build,
  bundle, and route validation pass in control-plane mode.
- The clean validated commit is a fast-forward of the latest `origin/main`, and
  remote `main` is verified at that commit after the single push.

## Validation Log

### Plan and baseline

- PASS: `git fetch origin main`
  - Advanced `origin/main` from `0cbf130` to `bff155f`.
- PASS: isolated worktree creation from `origin/main`.
- PASS: original worktree inspection confirmed the dirty
  `feat/agent-chat-workspace` checkout remains separate.
- PASS: Stage 0 AST adoption enforcement.
  - `npm run design:adoption -- --report` audited 382 production source files.
  - Baseline active counts: 189 native-control bypasses, 38 low-level
    overlays, 122 non-exempt native table elements, 593 raw typography
    reconstructions, and 2 local shadows of public UI-package exports.
  - Exception inventory: one permanent Markdown-renderer structural exception
    and zero temporary exceptions.
  - `npx vitest run scripts/design-adoption.test.mjs` passed 9 mutation and
    metadata tests.
- PASS: `npm run design:check`
  - Existing design-system policy passed across 382 source files.
- PASS: `npm run lint`
  - UI-package and application TypeScript checks passed.
- PASS: `npm run test -- --reporter=dot`
  - 136 files and 711 tests passed.
- PASS: Stage 1 shared UI foundations.
  - Dialogs and drawers now share focus containment and restoration, topmost
    Escape handling, background inertness with nesting references, body scroll
    locking, and reduced-motion behavior.
  - `DialogFrame` and `DrawerFrame` associate rendered descriptions through
    `aria-describedby`.
  - Added public `DataTableBody`, `DataTableRow`, `DataTableCell`, and typed
    `FileInput` primitives with catalog coverage and a minor Changeset.
  - The UI package reports zero AST raw-typography findings.
- PASS: `npm run ui:check`
  - Changeset, typecheck, 40-module build, 19-symbol export check, and package
    dry run passed.
- PASS: `npm run test -- --reporter=dot --maxWorkers=4`
  - 139 files and 719 tests passed.
- PASS: reviewed design-catalog browser update.
  - Initial `npm run design:snapshots` produced only the four expected catalog
    diffs.
  - Light desktop and dark mobile actuals were visually reviewed for field
    alignment, table rhythm, theme behavior, and compact reflow.
  - `npm run design:snapshots:update` regenerated exactly the four reviewed
    baselines and passed 19 checks with one intentional mobile skip.
  - Later no-update reruns encountered host interaction/font timeouts after the
    assertions had passed in update mode; no new image mismatch was reported.
- PASS: `npm run build`
- PASS: `npm run bundle:check`
  - 76 JavaScript chunks passed; largest was
    `vendor-react-BaiCVyGu.js` at 312,686 bytes.
- PASS: Stage 2 application overlay migration.
  - All production uses of low-level `Dialog`, `RightSidePanel`, and handmade
    dialog anatomy now compose through `DialogFrame`, `DrawerFrame`, or
    `DestructiveConfirmationDialog`; the low-level overlay adoption category
    reports exactly zero detections and zero exceptions across 384 production
    files.
  - Unframed compatibility preserves existing application chrome while the
    shared frames own focus containment and restoration, topmost Escape
    handling, background inertness, scroll locking, and nested overlay state.
  - The shared drawer supports left-side compact history, and framed dialogs
    are explicitly bounded to the viewport under enlarged text.
  - `npx playwright test tests/design-system/catalog.spec.ts -g "overlay
    frames" --project=desktop --project=mobile` passed 2 checks covering focus
    wrapping, Escape dismissal, trigger restoration, inert background,
    scroll-lock restoration, nested overlays, reduced motion, compact dark
    mode without horizontal overflow, and 200% text.
- PASS: Stage 2 validation.
  - `npm run design:check` passed across 384 source files.
  - `npm run design:adoption -- --report` reported zero low-level overlays and
    zero temporary exceptions.
  - `npm run lint` passed.
  - `npm run test -- --reporter=dot --maxWorkers=4` passed 139 files and 719
    tests.
- PENDING: Stages 3 and 4 validation.
- PENDING: Stage 5 and final validation.

## Publishing Log

- PENDING: pre-push fetch and fast-forward verification.
- PENDING: single direct push to `origin/main`.
- PENDING: remote SHA verification.

## Completion Criteria

- Every stage is marked complete with exact validation evidence.
- The execution plan is moved to `docs/exec-plans/completed/` and linked from
  the completed-plan index.
- The final handoff records commit SHAs, adoption counts, permanent exceptions,
  snapshot review, bundle result, remote-main SHA, and any publishing blocker.

Status: active.
