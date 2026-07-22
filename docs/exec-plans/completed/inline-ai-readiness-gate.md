# Inline AI Readiness Gate

## Goal

Replace persistent AI configuration dialogs with inline prerequisite states in
Kubernetes and virtual-machine assistants, while preserving readable
conversation history and keeping recent-activity decisions modal.

## Constraints and Decisions

- One shared readiness calculation determines whether an allowed, enabled AI
  provider has a configured credential and at least one allowed model.
- Historical conversations and navigation remain available while runtime setup
  is incomplete.
- Every action that can start or retry a run uses the same runtime-readiness
  predicate.
- AI Settings return paths must resolve to an assistant in the same workspace.
- Settings never redirects automatically after a save.
- The change is console-only and does not alter a control-plane contract.

## UX Acceptance Criteria

- Empty assistants replace suggestions and the composer with an unframed setup
  state; conversations with messages retain the transcript and show a compact
  setup row in place of the composer.
- Loading, unavailable, administrator, and read-only prerequisite states remain
  visually stable in full-page and docked layouts.
- New Chat, suggestions, attachments, drag and drop, model controls, edits,
  retries, and programmatic draft creation cannot bypass readiness.
- Only recent-activity decisions apply modal semantics, focus trapping, a
  scrim, and inert background content.
- Valid AI Settings return paths preserve the assistant route and session query;
  invalid or cross-workspace paths are ignored.
- English and Chinese interfaces expose equivalent setup and return copy.

## Validation Log

- `npm run test -- --run ...` passed the eight readiness, routing, Settings,
  and style test files (72 tests).
- `npm run lint`, `npm run contracts:check`, and `npm run smoke:routes` passed.
- `npm run test` passed 903 of 904 tests. The remaining failure is an
  unrelated workflow-preview assertion: the request includes `inputs: {}` but
  the test expects that property to be omitted.
- `npm run harness:check` reports only three unrelated over-budget files:
  `chatSubmit.ts`, `WorkspaceCatalogPage.tsx`, and
  `WorkspaceWorkflowsPage.tsx`.
- `VITE_APP_DATA_MODE=control-plane npm run validate` passed the design-system
  and TypeScript phases, then stopped at the same unrelated workflow-preview
  test failure.
- The control-plane fixture browser check passed for a light desktop transcript,
  dark desktop transcript, dark mobile empty VM assistant, and dark docked
  cluster assistant. Each state kept run-producing textboxes absent while the
  inline prerequisite remained visible.

## Completion Criteria

- Shared readiness, inline gates, Settings return navigation, translations,
  documentation, and tests are implemented.
- Required repository validation passes, or any environmental limitation is
  recorded with residual risk.
