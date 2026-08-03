# Chat Cancel Follow-up Race

## Goal

Keep a cancelled chat turn and its trace stable when the user immediately sends
a follow-up before the cancelled request receives its backend run ID.

## Constraints

- Keep the change inside the shared target-chat state boundary.
- Do not change API contracts, copy, layout, or normal run behavior.
- Preserve newer turns when a cancelled request resolves late.

## UX Acceptance Criteria

- Cancellation feedback remains visible without requiring a refresh.
- An immediate follow-up remains visible and completes normally.
- The cancelled trace footer is remapped to the accepted run ID and remains
  available after the older request settles.
- Refresh produces the same transcript and terminal state.

## Validation Log

- `npm test -- --run src/features/targets/chat`: passed, 24 files and 147 tests.
- `npm run app:typecheck`: passed.
- `npm run harness:check`: passed.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed, including 200
  test files and 976 tests, production build, bundle budget, and route smoke
  checks.

## Completion Criteria

- A deterministic regression test covers cancel-before-acceptance followed by a
  newer turn.
- Focused chat tests and `npm run validate` pass.
