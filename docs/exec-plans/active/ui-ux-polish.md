# UI/UX polish release handoff

Current at 2026-10-19. Phases 01–06 and 07A/07B/07C are implemented and
scoped-review approved. Phase 08 is **implemented; release verification blocked**
on the remaining live acceptance below. All automated component stages passed.
The integrated review required one focused cleanup; its copy fixes and evidence
consolidation are included in this change set. Release readiness is
not established. PAC final automation passed. The single scoped cleanup
re-review approved all six findings, spec compliance and code quality, with no
new findings. Subsequent bounded integration repairs also passed scoped review:
one production selector fix and targeted test setup/organization corrections,
not a second broad cleanup. Final canonical and complete interaction/parity
stages passed; the unchanged visual-stage results are retained with source
identity evidence. A successful end-to-end wrapper rerun is not claimed.

## Checkout and scope

| Repository | Integration target | Reviewed base | Scope |
| --- | --- | --- | --- |
| management-console | `main` | `3baf36e3a50ed35707c621a9c65e6670832d704c` | Phase implementation, tests and handoff |
| platform-admin-console | `main` | `766452c5febac5cdc751128c51f732b34c01107f` | Coordinated implementation, tests and handoff |
| control-plane | `main`, unchanged | `bf24329069af1342da968c9f3bd653f746885fbf` | Producer validation only |

Developed on matching `fix/ui-ux-polish` branches. On 2026-10-19 the user
authorized one consolidated commit per console and direct integration/push to
`main`, together with deployment setup commit `60dedac`. Git history records
the integrated revisions; the table preserves their review baselines. This
approval does not authorize a release, deployment, paid/model call or dependency
change. Existing tokens, components,
route ownership, authorization and API contracts are preserved. No redesign,
registry restoration, defaults reconciliation, quota editor or privileged API
is introduced. The fixture startup boundary remains `DEV && mock`.

## Current finding disposition

| Finding | Implemented disposition and boundary |
| --- | --- |
| F01 | Shared exact-context approval review and live expiry/permission/identity guards; ambiguous decisions re-read authority. Engine-backed acceptance remains pending. |
| F02/F11 | Explicit new grant choices; paged/searchable Agent owner members, selected identity retained across searches, retry preserves loaded rows. Server race authority unchanged. |
| F03/F06/F07/F08/F12/F20 | Existing primitives provide associated labels, keyboard/pointer/focus restoration, reachable compact actions and bounded previews/panels. PAC F07 existing panel structure retained after checks. |
| F04/F05/F09/F10/F13 | Truthful toasts/load errors, explicit workflow identity, local skill-draft discard guard and distinct Open Agent/Chat destinations. |
| F14/F15/F18/F22/F23 | Connectivity, timezone/schedule, recovery, account/catalog and full source copy reflect supported behavior without backend changes. |
| F16/F24 | Run permissions determine approval, including enabled write rows; selected count surfaces distinguish zero/one/many with bundled locale parity. |
| F17 | PAC compares loaded usage, effective limits and selected defaults; zero/unlimited/unavailable and overrides remain distinct. Stale policy refresh blocks resubmit; retain-existing stays explicit and server-triggered. |
| F19 | Find/copy/download use loaded Kubernetes/VM output only. VM display timezone is distinguished from exported original timestamp offsets/precision. Existing follow/tail/refresh behavior and stale output retained. |
| F21 | MCP search/filter drains existing cursor pages before claiming completeness; group controls still address complete groups. Local saved-effective summary qualifier does not change configured drafts or server count. Agent appearance initially collapsed. |

Three shared patch Changesets remain part of the package:
`steady-select-keyboard-pointer.md`, `truthful-toast-severity.md` and
`bounded-accessible-overlays.md`. PAC replicas preserve their intentional placement/ID differences.
Requirements and contracts are unchanged by the final copy cleanup.

## Compatibility, integration and rollback

User-visible changes are deliberate: approvals open exact-context review before
decision; new grants/invitations require explicit choices; populated skill
drafts require discard confirmation; owner discovery is paginated/searchable;
log exports contain only loaded output; MCP filters distinguish unsaved
configured state from saved-effective counts. No database migration, credential
format, backend authorization policy or public endpoint changes are included.

Coordinate the canonical MC UI changes before or alongside the matching PAC
replica; both consoles remain independently buildable against the unchanged CP
revision above. App versions remain MC `0.0.1-experimental.1` and PAC
`0.0.1-experimental.5`; both UI package versions remain `0.0.0` pending normal
Changeset release handling. Direct `main` integration was requested, not PRs. Deployment
`60dedac` is an independent local-source setup repair, not a production change.

After release approval, rollback consists of restoring the
previous console build pair; no data rollback is needed for this frontend-only
package. Do not discard unrelated local files.
Release promotion remains blocked on the acceptance evidence below.

## Reproducible verification

Pre-integration sanity check on 2026-10-19: both consoles' `npm run validate`
passed again in control-plane mode under native Node 22.23.1 (MC 1187 tests,
PAC 99). Deployment `task validate` and parent `task validate` also passed.
No product or test changes followed the complete browser-stage verification;
only handoff integration status was updated. Production acceptance below is
still separate from permission to commit and push.

Use native Node 22, not a version-label shim. This checkout used Node 22.23.1:

```sh
export PATH=/Users/tjtanjin/.npm/_npx/d295cebdb7c54afe/node_modules/node/bin:$PATH
unset NO_COLOR FORCE_COLOR
node --version
VITE_APP_DATA_MODE=control-plane npm run validate
VITE_APP_DATA_MODE=control-plane npm run validate:full
```

On another machine, prepend that machine's actual Node 22 executable directory.
The full gate includes canonical checks, design-system snapshots, route
snapshots, fixture browsers and MCP parity. Browser suites start explicit mock
servers; the production build remains control-plane mode. Do not use live
credentials or replay the historical disposable-data setup scripts.

The final full gate uses the existing **Linux** baselines, not new macOS images:
cached `mcr.microsoft.com/playwright:v1.61.1-noble` (arm64), native Node 22.23.3
copied read-only from the local MC container, a frozen tracked/untracked source
copy and a separate lockfile-matching Linux dependency tree. Runtime flags are
`CI=1 VITE_APP_DATA_MODE=control-plane`; the invocation is `npm run validate:full`.
The runner has no external network or published ports, 1 GiB shared memory,
read-only Git metadata and `/workspace` as Git's explicit safe directory.
Reproduction on another machine requires Linux, actual Node 22, dependencies
from `npm ci`, and the lockfile's Playwright/Chromium version. Do not regenerate
another platform's baselines to bypass a comparison failure.

Focused cleanup commands, run from this repository:

```sh
npm test -- src/features/targets/admin/McpServerToolsDialog.test.tsx src/i18n/copyConsistency.test.ts src/i18n/resources.test.ts src/pages/virtual-machines/virtualMachineLogContent.test.ts
npm run app:typecheck
FIXTURE_APP_PORT=4191 npm run smoke:fixtures -- tests/fixtures/workspace-access-selection.spec.ts tests/fixtures/workspace-agents-accessibility.spec.ts tests/fixtures/log-investigation.spec.ts --grep 'member search counts|owner loaded counts|VM exports distinguish'
```

These cleanup checks passed 23 unit/locale tests and three fixture-browser cases,
plus app typecheck. Regressions were observed failing before the copy fixes:
enabled-write approval and saved-effective qualifiers in English/Chinese,
Members/owner singular counts, and Singapore VM export scope. Copy/download
retain source `Z`/`+02:00` timestamps with six fractional digits. Original source
formatting is unchanged. Existing browser specs also cover broader state,
pagination, permissions, refresh failure and light/dark containment.

Final frozen-source PAC automation passed under native Node 22:
`ADMIN_CONSOLE_DATA_MODE=control-plane npm run validate`, 99/99 tests and all
canonical gates; directory/UI-polish/hosted-policy built-assets browser verifiers
passed 14/33/7 cases respectively (54 total, no skips). Initial HTTP-test
`EPERM` failures were sandbox loopback restrictions; the approved rerun passed
without a product fix. PAC reproduction commands are in its active handoff.

Final-source MC canonical validation passed 232 files/1187 tests. Unchanged CP
isolated-DB/Redis validation passed 243 suites/1313 tests with no test skips.
Its migration-chain static check passed; optional SQL upgrade execution was not
enabled, and this package contains no migration change. Parent platform-contract,
runtime-truth and `task validate` passed under Node 22.

Root inspected and byte-verified all 34 changed Linux images:
three Phase 05 approval layouts; 23 selected-route images for settings, skills,
schedules, approvals, accounts and VM logs/resources; and eight final-matrix
images for Kubernetes overview/health and mobile Kubernetes/VM MCP catalogs.
The last eight reflect the scoped fixture counts/clock, existing issue-list
footer, catalog wording and compact counters. No production/test logic or
comparison threshold was changed to accept them. All 50 route chunks
(59 routes × five layouts) and forced-colors passed. Design-system browsers
passed 27 cases with one existing mobile skip for the desktop logout test.

The bounded integration repair uses the existing dock floating layer for
capability previews, aligns one relative-time assertion with `FIXTURE_CLOCK`,
and supplies a test-owned Agent skill to retain populated-cache coverage.
Geometry tests await settled animation and isolate quick-VM capability layout
from recent-activity startup. No bounds, focus or 200-tool assertions were
relaxed. The parity test now uses the approved Open Agent label. Focused
browser checks passed 23/23, unit checks 29/29 and MCP parity 8/8, plus app
typecheck. The subsequent complete `validate:full` stopped at fixtures with
249/251 passed: one 15-navigation case exhausted its cumulative 60-second
budget, and one owner-control check started while the Agent form was loading.
These are retained failure evidence, not a successful wrapper invocation.

The grid test is now three catalog cases, each preserving its entire viewport
matrix; the owner test awaits its loaded form before the unchanged three-second
search assertion. Both repairs passed scoped review and all seven covering
cases. No timeout, retry, geometry tolerance or product change was added.
The final frozen-source command was:

```sh
npm run validate && npm run smoke:fixtures && npm run smoke:mcp-parity
```

It exited 0: 232 files/1187 canonical tests, all 253 fixture-browser tests
(16.5 minutes), and all eight MCP parity tests (52 seconds), with no fixture or
parity skips/retries. The earlier passing visual-stage evidence is retained
because comparison of all 1,527
source files found differences only in these two fixture tests and two factual
handoff documents. All runtime, visual-test, configuration and baseline inputs
are byte-identical. No successful end-to-end `validate:full` rerun is claimed.
After the final run, a second comparison found only this factual handoff differed
from the tested copy. The retained final log is
`tmp/ui-ux-polish-2026-10-18/verification/acornops-ui-polish-final-stages.log`
in the parent workspace; prior failure logs and traces are retained alongside it.

The route harness now shares `FIXTURE_CLOCK` rather than an unrelated July 19
clock. Activity preparation acknowledges its initial summary through normal
Refresh and asserts loaded rows/no update notice. The timing-dependent initial
activity notice was reproduced on unchanged HEAD; production logic is untouched.
The production build's 54 emitted JS/CSS assets contain none of the five checked
fixture identity/router/worker markers. The source fixture import remains
guarded by `DEV && mock`. Final integrated fixture/parity stages passed.
The initial activity notice remains a separate preexisting observation; only
the snapshot preparation acknowledges it, using the ordinary Refresh action.

## Fixture reproduction

Run `VITE_APP_DATA_MODE=mock VITE_UI_SOURCE_MODE=1 npm run dev -- --host 127.0.0.1`.
Use `/workspaces/fixture-workspace/members`, Agent
`/workspaces/fixture-workspace/agents/fixture-specialist/settings`, target
`/workspaces/fixture-workspace/kubernetes-clusters/fixture-cluster/mcp-servers`,
or VM `/workspaces/fixture-workspace/virtual-machines/fixture-vm/resources`.
Append the scenario parameters below; reload resets request counters/state.
The fixture default is three members/two tools; scale flags are opt-in only.

| Parameters | Scenario |
| --- | --- |
| `fixtureMembers=125&fixtureMemberNames=duplicate-long` | 50/50/25 pages, unique IDs, two Alex Chen identities and long names |
| `fixtureRoles=custom-reordered` | Viewer, custom Incident reviewer, Owner, Admin |
| `fixtureMcpTools=200` | Kubernetes MCP 100 read/100 write tools; VM unaffected |
| `fixtureEmptyTargets=1` | Empty target inventory and dependent issues |
| `fixtureEmptyPath=/members` | Empty read without deleting stored members |
| `fixtureForbiddenPath=/members` | Non-retryable 403 |
| `fixtureFailurePath=/members&fixtureFailureOn=1` (or `2`) | Initial failure (or refresh failure), then retry |
| `fixtureFailurePath=/kubernetes-rbac-additions` | Persistent onboarding failure |
| `fixtureDelayPath=/members&fixtureDelaySequence=1200,0` | Out-of-order responses; delays capped at five seconds |
| `fixtureApprovalState=expired` (or `already-decided`) | Non-pending record; conflicting decision 409 |

Default fixture time is `2026-07-15T08:30:00.000Z`; `fixtureClock` accepts an
encoded ISO override and tests can call `createFixtureState(clock)` or
`resetFixtureStore(clock)`. Telemetry is 30 minutes earlier. The illustrative
preview produces two weekday 09:00 Asia/Singapore occurrences, not general cron
evaluation. Tests needing another clock must align the browser clock too.
Approval detail for `fixture-execution-review-run` matches inbox IDs/full
producer DTOs; workflow pre-step detail uses `workflow.approval_gate`.
The explicit offline stub supports `UI_POLISH_FIXTURE_QUERY`; production does not.

## Completed local observations and remaining gates

Coordinator CUA checked exact keyboard/narrow sequences, MCP 200-tool search and
last row, disabled registry/direct URL, collapsed Agent appearance and bounded
plan preview. Real local k3d logs covered loaded find/follow/status, unavailable
pod failure and disabled export. CP→AgentV connectivity/log reads used simulated
AgentV, not real Linux/systemd.

Disposable real local backend acceptance covered 53 members (50+3/search),
selected owner draft retention without saving transfer, Viewer grant/revoke,
and a paused read-only schedule with Singapore/New York preview/persistence
and no execution. No model calls occurred. The one disposable workspace and all
54 synthetic accounts were removed normally/guarded; 110 synthetic sessions
were revoked. Existing workspaces/accounts were preserved. Disposable test
database/cache containers and root browser previews have been removed/stopped.
The final isolated runner exited and was automatically removed. After retaining
logs/traces/screenshots, the exact task-owned 1.2 GiB scratch directory containing
source/dependency copies was removed; it is recreatable, not user data. The
original local stack remains running, and unmerged review records are preserved.
Never automatically rerun old fixed-ID live setup scripts.

PAC live read-only sidebar/compact audit checks completed without changing the
system theme. A live dark-theme change awaits permission; isolated dark fixture
coverage is separate. Still unverified: genuine OIDC/recent-auth/session loss
and last-owner races, harmless engine-backed approval/dispatch, real Linux VM
and recovery, approved HTTPS MCP OAuth provider/canary, genuine 200%/400%
browser zoom, representative screen reader, live plan conflict/retain-existing
and OS clipboard. Mocks, CSS reflow and keyboard/AX checks do not close them.

Separate preexisting launch risk: `useWorkflowCapabilityPreview` rejects a
direct `read_only` coordinator preview against aggregate `read_write` policy,
potentially blocking a valid launch. It awaits user scope approval; no fix is
included. A separate fixture observation showed timing-dependent VM quick-chat
initialization (recent-activity chooser versus already-selected session).
The capability-layout test now isolates that gate; session production code is
unchanged, and this observation has not been established as a production defect
or fixed. Tool-results, NetworkPolicy and VM-recovery rollout gates remain
separate. The old caniuse-lite warning is disclosed maintenance only, neither
suppressed nor repaired here.

| Remaining acceptance | Owner/input needed |
| --- | --- |
| Real VM feed and recovery | Release operator supplies an isolated Linux/systemd VM and authorizes its recovery exercise; the local simulated AgentV is insufficient. |
| MCP provider/OAuth canary | Approved HTTPS MCP provider and securely supplied test credentials; no private-network/HTTPS guard relaxation. |
| Approval/dispatch and permission races | Disposable harmless engine-backed scenario plus test actors, explicitly excluding production/paid model operations. |
| Identity/recent-auth/session loss | Test IdP/account flows and authorized identity/last-owner scenarios; fixture roles do not prove genuine authentication. |
| Plan conflict/retain-existing | Disposable eligible plans/workspace and authorized conflict scenario; the local single Default plan cannot prove it. |
| Accessibility and clipboard | Human or supported-device pass for native 200%/400% zoom, representative screen reader and OS clipboard permission. |
| Existing preview incompatibility | Product owner approves a separate focused fix; preserve the direct-executor versus aggregate-policy distinction. |

Previously blocked browser actions (fixture Launch entry and temporary live PAC
theme switch/restore) await explicit permission and were not bypassed. The
release owner must also reconcile the independent rollout/upgrade gates; this
UI evidence does not certify them.

Parent phase/review artifacts are supplemental local detail, not the sole
handoff evidence. Preserve this record with the implementation.
Scoped review and automated-stage verification are complete; the release owner
must supply the remaining live acceptance and authorize release promotion.
