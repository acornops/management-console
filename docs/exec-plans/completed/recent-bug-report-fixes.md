# Recent Bug Report Fixes

## Scope

- Prevent repeated submission of an edited cancelled or failed chat turn.
- Stop pod-log refreshes caused by unrelated component renders.
- Preserve a reader's log viewport while allowing follow mode to track the bottom when appropriate.

## Plan

1. Add a deterministic chat submission-lock regression test and correct the lock lifecycle.
2. Stabilize pod-log loading dependencies and add viewport-preservation helpers and coverage.
3. Run focused tests followed by the repository validation entrypoint.

## Notes

- All API access remains within the existing control-plane client boundary.
- No visual redesign, API change, database migration, or new dependency is intended.
