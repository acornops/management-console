# Chat Runtime Selection

## Goal

Keep model and reasoning choices independent per conversation across
navigation and restore accepted choices across login, while retaining unsent
changes only for the current signed-in browser session.

## Constraints and Decisions

- Backend `lastRuntimeSelection` is the durable accepted value.
- Unsent overrides use user/workspace/target/session-scoped `sessionStorage`.
- New chats start from workspace defaults.
- Logout clears unsent overrides.
- Invalid restored choices fall back with a visible non-blocking notice.
- The console tolerates older control-plane responses without runtime fields.

## UX Acceptance Criteria

- Chat A and Chat B restore different selections.
- An unsent selection survives route/view remounts and refresh but not logout.
- Accepted choices restore after login.
- Removed models fall back without losing composer text.

## Validation Log

- Passed focused runtime-selection, session-sync, submit, and storage tests.
- Passed `VITE_APP_DATA_MODE=control-plane npm run validate` (760 unit tests,
  14 Playwright tests, membership, contract, harness, build, and route-smoke
  checks).
- Passed `node scripts/harness/check-platform-contracts.mjs` at the workspace
  root.
- Live browser validation confirmed Chat A High and Chat B Low restore
  independently; an unsent Chat A Medium override survived chat switches and a
  page refresh; logout cleared it and login restored the durable High value.
- Live browser validation confirmed a fresh chat starts at workspace-default
  Low and normal AI completion returns focus to the composer.
- Invalid/malformed and older-backend fallbacks are covered by deterministic
  unit tests; the live profile did not contain a second model that could be
  disabled safely.
- Cleanup review removed the redundant per-hook runtime map, made browser
  storage invalidation explicit after writes and acceptance, limited `new`
  draft-key cleanup to actual backend-session creation, and discarded malformed
  stored entries.

## Completion Criteria

- Kubernetes and VM chat use controlled per-conversation selection state.
- Draft persistence, logout cleanup, fallback handling, contracts, and tests
  pass.

All completion criteria are satisfied.
