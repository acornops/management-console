# AI Settings Seamless Loading

## Goal

Retain the fetched AI settings snapshot in the mounted Settings shell so tab revisits do not refetch or flash a loading notice.

## Scope

- Add a workspace-keyed AI settings resource owned by `SettingsPage`.
- Feed AI settings mutations back into the retained snapshot.
- Show a reduced-motion-safe structural skeleton only when no cached snapshot exists.
- Keep load failures retryable and credential drafts write-only and tab-local.
- Do not change control-plane contracts, routes, authorization, or browser cache policy.

## Validation Plan

- Focused source contracts: `npm run test -- src/pages/SettingsPage.test.ts src/pages/WorkspaceAiSettingsPage.test.ts`
- Required repository validation: `VITE_APP_DATA_MODE=control-plane npm run validate`

## Notes

- Cache lifetime is the mounted Settings shell.
- Documentation impact is limited to this execution note because runtime behavior and public contracts are unchanged.

## Validation Outcome

- `npm run test -- src/pages/SettingsPage.test.ts src/pages/WorkspaceAiSettingsPage.test.ts`: passed, 17 tests.
- `npm run contracts:check`: passed.
- `npm run harness:check`: passed.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: stopped in `npm run lint` on unrelated `Select` callback typing errors in `src/design-system.tsx` and `src/pages/WorkspaceMcpSettings.tsx`.
- A separate `npm run test` completed with 687 passing and 7 unrelated source-contract failures in ongoing page-composition and shared-control work.
