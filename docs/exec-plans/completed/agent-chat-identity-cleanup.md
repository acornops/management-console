# Agent chat identity cleanup

Status: completed 2026-08-01

## Goal

Use Agent identity and immutable run snapshots consistently in direct-chat UI
contracts.

## Outcome

- Simplified direct-conversation API types, route fixtures, and tests.
- A subsequent definition cleanup removed the obsolete restore-point UI and
  Workflow specialist counters as well.

## Validation

- Lint, 781 tests, contracts, and production build passed.
- Canonical validation remains blocked by two unrelated semantic-typography
  violations in `src/app/NavCountBadge.tsx`.
