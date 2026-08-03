# Agent Chat Composer Parity

## Goal

Show the effective Agent-chat tools and skills beside the model control using
the same capability-preview component as target chat.

## Constraints

- Preserve the current shared composer layout and the unrelated in-progress UI
  changes in this worktree.
- Fetch effective capability data from the control plane; do not infer it from
  the Agent definition.
- Keep target-chat behavior unchanged and retain keyboard, mobile, and error
  behavior from the existing shared control.

## UX Acceptance Criteria

- Agent chat shows the same tools-and-skills chip as target chat.
- The preview reflects read-only versus read-write conversation access.
- Loading, unavailable, empty, and credential-readiness states use the existing
  shared presentation.

## Decision Log

- Keep Agent and target chat on the existing shared conversation view and
  capability-preview control.
- Inject a subject-specific preview loader into the shared view; target chat
  keeps the default target loader and Agent chat supplies its Agent loader.
- Disable explicit slash-reference insertion for Agent chat until the Agent
  message contract supports reference payloads, while still showing the
  effective read-only capability preview.
- Wire the existing model selector through the Agent message API and hydrate it
  from the resolved run selection.

## Validation Log

- `npm run app:typecheck`: passed.
- Focused Vitest suite for the API, shared preview control, and Agent loader:
  14 tests passed.
- Full unit suite in control-plane mode: 199 files and 976 tests passed.
- Design adoption, membership, contracts, bundle, build, route smoke, and
  workspace platform-contract checks passed.
- Focused Playwright assertion for the docked Agent chat passed and verifies the
  capability chip, preview contents, and dock-contained popover geometry.
- The broader Agent browser file passed 21 of 23 cases; two unrelated Agent
  Tools page expectations fail in the pre-existing dirty worktree.
- Canonical `npm run validate` remains blocked by unrelated design-system
  findings in `VirtualMachinesPage.tsx` and `WorkspaceAgentsCatalog.tsx`, plus
  unrelated harness line budgets in `App.tsx`, `VirtualMachinesPage.tsx`, and
  `styles.test.ts`. The changed shared chat view is within its line budget.

## Completion Criteria

- The Agent API client consumes the new preview contract.
- The shared conversation view accepts a subject-specific preview loader.
- Targeted component and fixture checks plus control-plane-mode validation pass.

Completed on 2026-08-03. The outstanding canonical validation findings are
outside this change and were present in the user's concurrent console worktree.
