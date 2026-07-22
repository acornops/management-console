# Eliminate Light-Theme Refresh Flicker

## Goal

Keep the first paint aligned with the signed-in profile's theme while preserving independent anonymous/global and per-profile preferences.

## Constraints

- Limit changes to the management console; no API, backend, contract, or visual-design changes.
- Preserve `System`, Light, Dark, invalid-value, unavailable-storage, and live operating-system theme behavior.
- Do not overwrite the anonymous global preference while authentication state is unresolved or changes scope.
- Preserve unrelated work already present in the feature branch.

## Implementation

- Add an internal active-session theme hint used by synchronous and React initialization before the global preference.
- Suspend anonymous preference loading and persistence during session restoration.
- Synchronize the hint after profile preference loading and profile theme changes.
- Clear the hint and reload the global preference after failed restoration or logout.
- Add unit, browser regression, and durable design-system documentation coverage.

## Validation

- Passed `npm run test -- src/app/preferences.test.ts`: 1 file and 18 tests.
- Passed `npm run design:snapshots -- tests/design-system/theme-behavior.spec.ts --project=desktop`: 6 browser tests.
- Passed `npm run validate`: design policy across 262 source files, TypeScript, 124 unit files and 779 tests, 17 browser checks, workspace membership, contracts, harness budgets, production build, and route smoke.
- The browser suite intentionally skips the desktop-account-menu logout interaction in the mobile project; failed-restoration fallback and all mobile theme behavior still run there.
- No screenshot baselines changed. The production build retained its existing large-chunk advisory.

## Completion Criteria

- A profile Light preference remains light before and after restoration when the global preference is Dark.
- Failed restoration and logout return to global Dark without modifying the global or profile preference.
- Targeted and repository validation pass, with exact results recorded before this plan moves to `completed/`.

All completion criteria are satisfied.
