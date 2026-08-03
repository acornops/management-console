# Cluster Permission Mode

## Goal

Replace the two-state Cluster Write Safety selector with the same three runtime
permission modes used by Agent Settings.

## UX contract

- Cluster Settings offers Read only, Ask before changes, and Auto-run allowed
  changes with consequence-focused descriptions.
- The selector writes the new `permissionModeOverride` contract.
- Existing control-plane responses without the new enum safely fall back to the
  legacy write-confirmation policy.
- Read-only is displayed distinctly from approval-required and never as
  “confirmations not required.”

## Outcome

- The selector lives in Cluster Settings and uses the Agent permission labels
  and descriptions.
- The chat policy banner and conversation access toggle are no longer exposed.
- Policy conflicts narrow stale conversations to read-only and retry once.
- Control-plane errors are formatted as product errors without the transport
  prefix.

## Validation

- Full unit suite passed: 200 files, 982 tests.
- App typecheck, contract check, and production build passed.
- Focused browser validation found one visible Permission mode selector in the
  Run permissions section. Internal policy provenance is intentionally omitted.
- Repository harness remains blocked by a pre-existing one-line budget overage
  in `src/styles.test.ts` in the dirty worktree.
