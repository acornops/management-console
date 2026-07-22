# Destructive action consistency

## Goal

Make persistent lifecycle and destructive-action settings visually consistent
without weakening errors, warnings, or active confirmation states.

## Scope

- Use one shared neutral, divided surface for standing lifecycle actions.
- Keep exit and reversible actions secondary until confirmation.
- Reserve danger emphasis for irreversible delete actions and active danger
  confirmations.
- Preserve existing permissions, confirmation flows, API behavior, and copy.

## Implementation

- Add shared `DangerZone` and `DangerZoneRow` primitives.
- Migrate workspace leave/delete and agent disable/delete controls.
- Remove the custom danger styling from account logout.
- Expose the existing permission-gated cluster and VM deletion flows from each
  target's Settings page with typed-name confirmation.
- Document the persistent-versus-transient danger treatment in the design-system
  standard.

## Validation

- Focused component and page source-contract tests: 13 files, 119 tests passed.
- Reviewed desktop and mobile catalog snapshots in light and dark themes; four
  lifecycle catalog baselines updated intentionally.
- Authenticated theme restoration browser regression: passed for profile Light
  over global Dark, logout, failed restoration, System, and live OS changes.
- Full `npm run validate`: 118 test files and 710 tests passed; 17 Playwright
  checks passed with one intentional mobile skip; membership, contract, harness,
  production build, and route smoke checks passed.

No backend or API-contract changes were required.

## Security review

- Cluster and VM delete controls render only with `manage_targets` authority.
- Existing typed API clients and backend authorization remain the enforcement
  boundary.
- Typed-name confirmation is required and locked while deletion is pending.
- Errors are normalized without exposing credentials or request secrets.
