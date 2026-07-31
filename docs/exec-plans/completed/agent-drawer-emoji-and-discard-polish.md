# Agent drawer emoji and discard polish

## Goal

Make Agent identity selection feel deliberate and space-efficient, and replace
browser-native discard prompts with the console's existing accessible
unsaved-changes dialog.

## Constraints

- Preserve the create and edit drawer routes and drafts.
- Keep emoji controls keyboard reachable with 44px targets.
- Reuse the shared drawer, dialog, button, and input vocabulary.
- Keep the native `beforeunload` safeguard for full-page exits, where browsers
  do not permit a custom dialog.

## UX Acceptance Criteria

- Curated emoji choices form a compact, evenly spaced grid without stretching
  across the drawer.
- The picker offers a broader operationally useful set while still accepting
  one custom emoji.
- The selected emoji remains visible and is announced through pressed state.
- Closing a dirty create or edit drawer opens the shared unsaved-changes
  dialog.
- Cancel keeps the draft and drawer open; discard closes the drawer and clears
  the draft.
- Same-page Back navigation uses the same dialog instead of `window.confirm`.

## Validation Plan

- Focused Agent avatar unit tests.
- Focused fixture-browser coverage for emoji layout and discard behavior.
- `npm run lint`
- `npm run build`
- `git diff --check`

## Completion Criteria

- Focused tests and required frontend style checks pass.
- Live desktop and compact browser checks confirm the picker density, custom
  dialog, focus behavior, and drawer preservation.

## Validation Log

- Focused Agent avatar tests passed: 3 tests.
- Focused fixture-browser coverage passed: 2 tests covering dense 44px emoji
  targets, custom discard confirmation, draft preservation, and browser Back.
- Full Vitest suite passed: 163 files and 789 tests.
- `npm run lint`, `npm run build`, `npm run contracts:check`,
  `npm run smoke:routes`, and `git diff --check` passed.
- Live browser verification passed at the default desktop viewport and at
  390x844. The compact drawer has 24 options, no horizontal overflow, and a
  measured 44px minimum option width.
- `npm run validate` reached `design:check` after the complete UI package check,
  then stopped on unrelated raw typography in `src/app/NavCountBadge.tsx`.
- Standalone `design:adoption` reports the same unrelated typography violation.
  Standalone `harness:check` reports only the unrelated 602-line `src/App.tsx`
  against its 600-line budget; `WorkspaceAgentsPage.tsx` is back under budget.

Status: complete.
