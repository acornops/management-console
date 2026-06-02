# Chat Approval Checkpoint

## Goal

Make write and run approvals in chat read as explicit operational checkpoints instead of incidental assistant-message content.

## Constraints

- Scope is limited to `TargetChatView`, chat locale copy, chat-related source guards, and this execution note.
- Preserve backend-backed approve/reject handlers, run trace rendering, message rendering, permissions, and chat submission behavior.
- Do not execute write actions from the UI; approval cards are only decision surfaces for the control-plane approval API.

## UX Acceptance Criteria

- Approval rendering is separated into a named checkpoint component inside `TargetChatView`.
- The checkpoint shows a stronger hierarchy for approval state, action, consequence, target, and explicit Yes/No controls.
- The Yes and No controls call the backend decision API through the existing `onApprove(approval.id)` and `onReject(approval.id)` handlers.
- Run trace rendering remains attached below the assistant message when present.

## Validation Log

- Red first: `npm run test -- src/styles.test.ts` failed on missing `ApprovalCheckpoint` source guard expectations.
- Passed: `npm run test -- src/styles.test.ts`.
- Passed: `npm run lint`.
- Passed: `npx impeccable --json --fast src` with `[]`.
- Passed: `npm run validate`.

## Completion Criteria

- Targeted chat approval source guard passes.
- `npm run lint` passes.
- `npx impeccable --json --fast src` passes or any blocker is documented.
