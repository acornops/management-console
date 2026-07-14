# Failed Chat Terminal Message

## Goal

Ensure failed target chat runs render an assistant-side error after reload, reconnect, or activity reconciliation even when the backend message history contains only the user turn.

## Constraints

- Reuse the existing run failure formatting and assistant message presentation.
- Do not create fallbacks for successful runs or overwrite a persisted assistant response.
- Use stable synthetic message identity per run to avoid UI remount churn.
- Cover initial hydration, target activity refresh, and watched-run reconciliation.

## Acceptance Criteria

- A failed run without a nonblank assistant message gets one synthetic assistant failure message.
- Existing assistant content for the failed run remains unchanged.
- Repeated reconciliation does not duplicate the failure message.
- Regression tests cover helper behavior and terminal hydration merging.

## Validation Log

- Red first: focused tests failed because failed-run restoration did not exist.
- Passed: `npm run test -- --run src/app/targetChatWiring.test.ts src/features/targets/chat/lib/session-utils.test.ts src/features/targets/chat/hooks/chatSessionSync.test.ts`.
- Passed: `npm run lint`.
- `npm run validate` passed design checks, typechecking, and all 752 unit tests, then stopped because `/usr/bin/google-chrome` is unavailable for Playwright snapshots.
- Passed separately: `npm run membership:check`, `npm run contracts:check`, `npm run harness:check`, `npm run build`, and `npm run smoke:routes`.

## Completion Criteria

- Completed: all change-relevant checks passed; visual snapshots were environmentally unavailable and no visual styling changed.
