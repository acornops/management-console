# Management Console Design-System Re-audit

## Goal

Re-audit the Management Console after the 2026-08-01 design-system remediation
and close any remaining measurable design-system failures without changing the
separate admin panel.

## Scope

- Capture fresh desktop, mobile, light, dark, resource-grid, DateTimePicker,
  and Account Settings evidence.
- Check every canonical Management Console route for WCAG 2.1 AA automation
  and 200% text reflow.
- Re-run design-system enforcement, shared UI validation, unit tests, harness
  policy, build, bundle budget, contracts, and route smoke coverage.
- Preserve concurrent MCP, chat, sidebar, and snapshot work.

## Findings and remediation

- The original resource-grid and DateTimePicker findings remain fixed.
- Account Settings retained two light-theme contrast failures in the selected
  sidebar account control. Use the shared soft-accent/readable-text selected
  state and primary ink for the selected email.
- The style-contract test exceeded its harness line budget after concurrent
  assertions were added. Extract those assertions without changing behavior.
- The production entry chunk exceeded the documented 350 KiB raw budget.
  Separate always-loaded target-chat and control-plane modules into stable
  application chunks rather than weakening the budget.
- A screen-reader-only telemetry table retained the visible table's 44rem
  minimum width and widened a real card at 110% scale. Keep the semantic table,
  but contain it in a clipped visually-hidden wrapper and neutralize the
  visible-table minimum width.

## Completion criteria

- Fresh screenshots are inspected and accepted.
- All 39 canonical routes pass WCAG automation and 200% reflow.
- Account Settings has no automated contrast violation.
- Design checks, unit tests, harness checks, build, bundle budget, contracts,
  and route smoke checks pass.

## Validation log

- Fresh screenshot capture: accepted six desktop/mobile/light/dark/locale/zoom
  states in `.audit/design-system-reaudit-2026-08-01/`.
- Canonical route contract: 39/39 ready; zero axe violations, normal overflow,
  or 200% reflow overflow.
- Account Settings contrast: reduced from two failing nodes to zero.
- Resource-card browser suite: 4/4 passed, including 110% effective scale.
- `npm run design:check`: passed across 437 source files.
- `npm run design:adoption`: passed with zero violations and zero temporary
  exceptions.
- `npm run lint`: passed.
- `npm run test`: 174 files and 819 tests passed.
- `npm run harness:check`: passed.
- `npm run contracts:check`: passed.
- `npm run build`: passed.
- `npm run bundle:check`: passed; largest of 48 JavaScript chunks is 312,686
  bytes.
- `npm run smoke:routes`: passed.
- Repository-native design snapshots: 23 passed and 1 intentionally skipped.
- Aggregate validation limits and unrelated concurrent failures are recorded
  in `.audit/design-system-reaudit-2026-08-01/report.md`.

## Completion status

Complete. All reproduced Management Console design-system findings are fixed
and covered by fresh visual, accessibility, reflow, unit, build, budget, and
focused browser evidence.
