# Target deletion completion implementation plan

**Goal:** Complete successful cluster and VM deletion promptly even when workspace-summary refresh is slow or fails.

**Approved scope:** Focused repair following the user's approval of the diagnosis. Await the real DELETE response before local removal. Preserve permissions, confirmation, errors, routing/filter context, and eventual quota refresh. No optimistic deletion before server success, API changes, new dependencies, or asynchronous backend deletion.

## Assessment and design

Both deletion callbacks await `refreshWorkspaceSummary` after DELETE succeeds. This delays dialog completion/navigation; VM summary failure is also incorrectly reported as deletion failure. The summary read is needed for quotas but does not determine deletion success. Start it without awaiting completion and catch failures separately. Existing summary updates exclude target IDs and members.

Options considered: remove summary refresh (would leave quotas stale), refresh independently after confirmed deletion (selected), and change deletion into a queued operation (outside this patch).

## Tasks and verification

- [x] Add browser regressions for both target types: pending summary, failed summary, failed DELETE, and preserved catalog/detail navigation. Run against unchanged handlers and observe expected failures.
- [x] Make summary refresh independent of deletion completion; ensure older refresh responses cannot overwrite newer summary state.
- [x] Verify removed targets do not reappear when the delayed summary settles, quotas eventually update, and repeated deletions with reversed refresh responses preserve the latest summary.
- [x] Run targeted browser tests and `VITE_APP_DATA_MODE=control-plane npm run validate`.
- [x] Obtain an independent review and record final evidence.

## Review focus

- Failed DELETE retains the target and actionable error without success navigation.
- Failed summary after a successful DELETE cannot become a deletion error or unhandled rejection.
- Catalog deletion and detail deletion both release the dialog and preserve return filters.
- Late summary responses cannot restore deleted rows or overwrite a newer deletion's summary.
- Navigation/unmount, workspace switches, and session changes must not apply stale updates to a different workspace.

## Coordination and progress

Control-plane companion adds indexes only. Both changes retain the existing synchronous 204 DELETE contract and can ship independently. Baseline repository state was recorded before editing.

## Review decisions

Cluster and VM callbacks share a small refresh helper keyed by workspace. Only the latest request applies its summary; loaded target/member lists remain intact. Logout and session expiry change a generation counter, so pending summaries cannot update a replacement session. The access-state read also checks this generation before recording its response: an old suspended response would otherwise block the replacement session before the summary helper could discard it. Stale access responses reject with `AbortError`, handled by the existing background-refresh catch. Authentication and permission decisions remain unchanged.

Independent review identified this lifecycle edge case and missing filter/retained-target assertions. All were addressed and re-reviewed with no remaining findings. Both the direct summary overwrite and the access-state side effect were reproduced in failing tests before their guards were implemented.

## Validation evidence (2026-10-31)

Base revision: `b916775d2a59a63892241ff030cbd06c0def9904`.

- `FIXTURE_APP_PORT=4193 npm run smoke:fixtures -- tests/fixtures/target-deletion.spec.ts --grep pending-summary` — failed all four cases with the original handlers, demonstrating stuck dialogs/navigation while summary responses were held.
- `FIXTURE_APP_PORT=4193 npm run smoke:fixtures -- tests/fixtures/target-deletion.spec.ts` — passed all 16 final browser cases: both targets, catalog and settings, pending/failed summary, failed DELETE, no duplicate submission, preserved search/status filters, retained targets after failure, late response without row restoration, and eventual quota updates after SPA navigation. An intermediate run had four test-message assertion mismatches; assertions were corrected to the actual error copy and all cases rerun.
- `npm test -- src/app/workspaceSummaryRefresh.test.ts src/services/control-plane/sessionLifecycle.test.ts src/services/control-plane/workspaceAccessState.test.ts` — passed 15 tests, including reversed responses, failed newer refresh, independent workspaces, stale summary and access-state responses across logout/expiry and reauthentication.
- `VITE_APP_DATA_MODE=control-plane npm run validate` — final rerun passed all gates and 1,248 tests across 235 files after the reviewed guards, including typechecking, UI packaging, design adoption, membership, contracts, harness, build, bundle budget and route smoke checks.
- `git diff --check` — passed.

Broad screenshot matrices, `validate:full` and live deployment tests were not run: this is a localized behavior change with no visual styling or external contract changes. The affected real-component browser paths and the standard validation gate cover this patch. Fixture quota responses deliberately emulate updated server usage; fixture storage does not recalculate it after deleting a target.

## Remaining limits

The console still awaits successful DELETE before removing a target. It does not show success while server deletion is pending or failed. Slow MCP teardown/SQL/audit work can therefore still cause a genuine wait. A failed summary leaves quotas temporarily stale until a later successful refresh; it no longer misreports VM deletion as failed. No live environment was changed.
