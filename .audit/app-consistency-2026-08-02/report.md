# Management Console consistency audit

Date: 2026-08-02  
Viewport: 1600 × 1000, light mode, reduced motion  
Scope: 13 representative fixture-backed routes spanning overview, catalogs, workflow activity, settings, target detail, and help.

## Verdict

The initial audit found six recurring inconsistencies. The implementation and
closure audit resolved all six. Fresh light/dark and desktop/mobile captures no
longer show unexplained divergence in typography, result feedback, semantic
status, navigation selection, route naming, or placeholder punctuation.

## Findings

1. **Status anatomy varies by feature.** Workflows use filled status pills; members use a green dot plus 14px title text; MCP servers use a green dot with an uppercase label; the overview combines pills, tinted callouts, and filled failure actions. Each is understandable, but status does not have one predictable visual grammar.
2. **Collection result summaries have multiple treatments.** Agents, Workflows, and Kubernetes Clusters show plain trailing text. Members and target capability lists use an uppercase outlined capsule. These surfaces solve the same “how many results?” need but look like different component families.
3. **The member ledger mixes semantic text roles within one row.** Names and Active are 14px/600, roles are 14px/500, sources are 12px/600 uppercase, and email is 14px/400. Some hierarchy is intentional, but Source reads noticeably smaller than the other primary values.
4. **Account Settings has a stronger active-navigation treatment than the rest of the sidebar.** The account tile gets a peach fill, accent border, and shadow; ordinary active destinations use the quieter shared sidebar highlight.
5. **Settings naming is slightly fragmented.** The sidebar says “Workspace Settings,” while the route heading says “Settings.” The account route also uses “Back to workspaces,” while target routes use title-cased “Back to Workspace.”
6. **Search placeholders use mixed punctuation.** Members and target MCP Servers use an ellipsis; Agents, Workflows, Kubernetes Clusters, Resources, and VM Logs do not.

## Strengths

- Every captured route title renders at 30px/600/36px.
- Section titles use 20px/600/28px, panel titles use 16px/600/24px, and row titles use 14px/600/20px.
- Standard ledgers use 12px/600/16px uppercase headers with the same 56.5px header height. The Cluster Overview issue table uses the documented compact 40.5px embedded-table density.
- Primary controls are consistently 44px high. Smaller 36–38px actions are reserved for inline or icon actions.
- Muted text measured approximately 4.89:1 against the warm page background, which clears WCAG AA contrast for normal text in this captured theme.
- Narrower Settings and Help columns appear intentional for readable form and support content rather than accidental width drift.

## Highest-impact normalization

1. Define one status matrix: pill, dot indicator, callout, and destructive state, with named rules for each.
2. Route every collection result summary through the shared DiscoveryFilterBar presentation, including Members and target capability inventories.
3. Normalize the Members primary row values, or explicitly document Source as metadata and visually separate it from the primary value columns.
4. Use the ordinary sidebar active-state recipe for the Account Settings tile.
5. Align route naming and placeholder punctuation through shared copy conventions.

## Closure audit

| Initial finding | Resolution |
|---|---|
| Feature-owned status anatomy | Textual lifecycle, health, issue, member, and MCP states now compose `StatusBadge`; colored dots remain only in labeled metric summaries. |
| Mixed result-summary treatments | `CollectionResultSummary` now owns standalone quiet result feedback and the same polite live-region semantics as `DiscoveryFilterBar`. |
| Mixed Members row roles | Source uses the standard UI text role and Active uses the shared compact/default status badge across responsive layouts. |
| Overstated Account Settings selection | The account trigger and menu destination now use the same quiet surface and accent-icon recipe as peer sidebar navigation. |
| Fragmented Settings/back-link naming | The workspace route and sidebar both say “Workspace Settings”; English return copy uses sentence case consistently. |
| Mixed placeholder punctuation | Input and search placeholders omit terminal punctuation; progress copy uses the typographic ellipsis. |
| Residual raw VM timestamp | Snapshot recency is formatted as human-readable relative time instead of exposing ISO data. |

Closure evidence:

- 30 fresh screenshots across 15 representative routes and four viewport/theme
  profiles are stored in `final/`.
- Every captured route title computed to `30px / 600 / 36px` in Outfit.
- No capture reported horizontal document overflow or a theme mismatch.
- The final targeted VM recapture reported no console errors, overflow, or theme
  mismatch after the last residual fix.
- Design-system enforcement passed across 440 production source files with zero
  adoption violations and zero temporary exceptions.
- The full Vitest suite passed: 183 files and 855 tests.

## Screen-by-screen health

| Step | Screen | Health |
|---:|---|---|
| 1 | Workspace Overview | Needs normalization: several status anatomies appear together. |
| 2 | Agents | Healthy; plain result summary differs from capsule-based catalogs. |
| 3 | Workflows | Healthy; orange Launch is an intentional activation action. |
| 4 | Workflow Activity | Healthy ledger; status pills differ from dot-based statuses elsewhere. |
| 5 | Members | Needs normalization: mixed row roles and custom result-count capsule. |
| 6 | AI Settings | Healthy; narrower form width is appropriate. |
| 7 | Kubernetes Clusters | Healthy; sparse card track is intentional. |
| 8 | Cluster Overview | Healthy; compact issue table is an intentional embedded density. |
| 9 | Cluster Resources | Healthy; standard header and row typography are aligned. |
| 10 | Cluster MCP Servers | Needs normalization: custom count capsule and connection-status treatment. |
| 11 | VM Logs | Healthy; monospaced timestamp is appropriate data typography. |
| 12 | Account Settings | Needs normalization: active account tile is visually stronger than sidebar navigation. |
| 13 | Help | Healthy. |

## Evidence limits

The closure set covers representative routes rather than every possible data,
permission, loading, and failure state. It includes desktop and mobile in both
themes, computed typography and overflow checks, source enforcement, typechecks,
and the full unit suite; it is not a claim of exhaustive WCAG conformance.
Fixture-only background request errors seen during several first-pass captures
did not affect rendered states. The final residual recapture was clean.
