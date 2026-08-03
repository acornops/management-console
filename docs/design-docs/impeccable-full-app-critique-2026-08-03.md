# Impeccable Full-App Critique Baseline

## Status

Active remediation baseline, recorded August 3, 2026.

This document preserves the findings from a whole-app Impeccable critique of
the Management Console. It is the source baseline for
[Impeccable 40/40 and Audit 20/20 Closure](../exec-plans/active/impeccable-40-audit-20-closure.md).

## Target

- Impeccable critique: 40/40 with no unresolved actionable finding.
- Impeccable audit: 20/20 with no unresolved actionable finding.
- All production routes and important route-backed states represented by
  inspectable validation evidence.

The critique baseline is 28/40. A fresh Impeccable audit was not run during the
critique, so the audit baseline is not yet measured. The existing repository
"design system 20/20" tracker is a separate score and must not be treated as an
Impeccable audit result.

## Evidence Reviewed

- Current `PRODUCT.md` and `DESIGN.md` context.
- All production markup in `src` and `packages/ui/src`, 274 scannable files.
- The 39 routes in `scripts/route-coverage-manifest.mjs`.
- Existing desktop, mobile, light, dark, and constrained-sidebar route
  snapshots.
- Direct visual inspection across every route family.
- Live Impeccable overlays on Workspace Overview, Kubernetes Resources, VM
  Logs/Resources, Workflow Runs, and Workspace Members.
- Typed route definitions in `src/utils/routes.ts`, including routes and states
  not represented by the canonical visual manifest.

## Design Health Baseline

| # | Heuristic | Score | Baseline issue |
| --- | --- | ---: | --- |
| 1 | Visibility of system status | 3 | Some save, repair, and external-link outcomes lack sufficient next-step feedback. |
| 2 | Match with the real world | 3 | Raw implementation codes still leak into operator-facing recovery states. |
| 3 | User control and freedom | 2 | Wrong-account invitations and completed external linking can end without a useful exit. |
| 4 | Consistency and standards | 4 | Navigation, controls, semantic color, tables, and target layouts are highly cohesive. |
| 5 | Error prevention | 3 | Some capability mutations need clearer consequence previews. |
| 6 | Recognition over recall | 3 | Truncated identity and icon-only chat controls create small recall burdens. |
| 7 | Flexibility and efficiency | 2 | Bulk operations and expert accelerators are limited. |
| 8 | Aesthetic and minimalist design | 3 | Repeated summary strips and card grids add avoidable noise. |
| 9 | Error recognition and recovery | 2 | Several errors identify failure without providing the shortest repair action. |
| 10 | Help and documentation | 3 | Help is visible, but external help can lose current task context. |
| **Total** |  | **28/40** | **Good foundation with important weaknesses** |

The cognitive-load baseline is three failed checks out of eight, a moderate
load. The failures are chunking, minimal choices, and progressive disclosure.

## Anti-Pattern Verdict

The console does not look like a generic AI-generated dashboard. The warm
ledger palette, restrained orange signal, operational copy, route-stable
navigation, and status vocabulary are specific to AcornOps and support trust.

The remaining generic patterns are localized:

- Agents uses a repeated identical-card grid where a scalable ledger would be
  faster to scan.
- MCP Servers, Skills, and Tools repeat a wide summary-strip-plus-table formula.
- Target overviews retain chart and metric cards even when the available data
  does not support a meaningful visualization.
- Excessive neutrality sometimes causes repair actions to carry less emphasis
  than their urgency requires.

## Priority Findings

### P1: Mobile governance and chat task completion

- The Approvals ledger preserves desktop columns at mobile width and clips
  decision context and actions.
- Cluster, VM, and Agent chat composers place controls beyond the available
  width on narrow screens.
- Chat run-detail metadata truncates too aggressively on mobile.
- The persistent chat navigation rail consumes scarce horizontal space.

Required outcome: mobile approvals become labeled stacked rows with visible
decision actions, and chat controls wrap into a stable narrow-screen
composition without horizontal overflow or lost actions.

### P1: Entry and integration dead ends

- A workspace invitation shown to the wrong signed-in account instructs the
  user to switch accounts but provides no switch-account or sign-out action.
- Linked, expired, and cancelled external-integration outcomes rely on status
  text without a strong return, retry, close, or destination action.
- The no-auth-method login state has no retry or environment diagnostic path.

Required outcome: every entry and integration state provides one obvious safe
next action and preserves enough context to recover.

### P1: Operational recovery language and actions

- Schedule and webhook failures mix lifecycle state, raw implementation codes,
  execution facts, and repair guidance in dense table cells.
- Cluster auto-triage can report a vague service failure with no direct retry or
  diagnostic action.
- Capability dependencies do not always expose the shortest repair path.

Required outcome: errors state the human-readable cause, affected object,
direct repair action, retry behavior, and optional technical detail.

### P2: Incomplete route-level design coverage

The route manifest calls its 39 entries canonical but omits valid production
routes and high-risk states:

- Help, signed-in home/workspace-list, and Not Found.
- Workspace Settings root.
- VM Services, Processes, Network, and Logs.
- Kubernetes Health alias.
- External-link Expired and Cancelled.
- Focused approval links and workflow create drawers.
- AI Settings return context, assistant sessions, and catalog artifact or
  destination states.
- Empty, loading, failure, permission-restricted, long-content, mobile, dark,
  and 200-percent text variants for important flows.

Required outcome: the manifest and browser checks prove the complete route and
state inventory rather than a representative subset.

### P2: Repeated summaries and templates

- Capability summary strips repeat values already visible in the inventory.
- Zero-value strips dominate empty Agent capability pages.
- Agent cards do not scale for expert comparison or bulk action.
- VM Overview duplicates waiting-for-data charts and then repeats the same
  facts in metric cards.
- Audit Log presents four filters, four time presets, Custom range, and Clear at
  one decision point.

Required outcome: retain only decision-changing summary information, move
advanced filters behind progressive disclosure, and prefer dense ledgers where
comparison is the task.

## Phase-by-Phase Route Findings

### Phase 1: Entry, identity, and support

- **Login:** distinctive and on-brand; the disabled-environment state is a dead
  end without retry or diagnostics.
- **Workspace Invitation:** clear facts and mismatch warning; missing an inline
  account-switch action.
- **External Integration Approval:** good identity and permission disclosure;
  long workspace lists need progressive disclosure and an access summary.
- **External Integration Linked, Expired, Cancelled:** status is clear; recovery
  and return actions are incomplete.
- **Help:** concise; external destinations should preserve console context.
- **Not Found:** clean but loses workspace context by offering only a generic
  home action.
- **Signed-in Home and Workspaces:** valid router states missing from canonical
  visual coverage.

### Phase 2: Workspace orientation and discovery

- **Workspace Overview:** strong issue-first hierarchy; repeated Open Assistant
  actions dominate and View More is ambiguous.
- **Kubernetes Clusters:** useful health preview; lacks an expert dense-list
  mode for large inventories.
- **Virtual Machines:** consistent with clusters; telemetry waiting states need
  timing or refresh expectations.
- **MCP Catalog:** effective master-detail composition; destination selection
  appears later than the page instructions imply.
- **Agents:** clear capabilities; identical cards are slow to compare at scale.
- **Agent Capability Drawer:** the visual readiness selector does not prove that
  the query-driven drawer has rendered.

### Phase 3: Automation

- **Workflows:** strong desktop master-detail model; two levels of tabs create a
  dense navigation decision.
- **Runs and Activity:** effective ledger; provenance and status details compete
  in narrow rows.
- **Schedules:** good cadence visibility; failure repair is buried inside a tall
  activity cell.
- **Incoming Webhooks:** clear endpoint facts; configuration and execution
  failures need separation.
- **Outbound Webhooks:** useful feature; naming must clearly distinguish it from
  workflow inbound webhooks.
- **Create Drawers:** important route-backed create and validation states have
  no canonical design-route coverage.

### Phase 4: Governance

- **Approvals:** strong desktop decision layout; mobile clipping blocks the
  primary task.
- **Audit Log:** readable results; the initial filter choice count is excessive.
- **Focused Approval:** shareable focus state exists but lacks dedicated visual
  coverage.

### Phase 5: Workspace and account configuration

- **Members:** strong ledger; route and page-title hierarchy make Members both a
  destination and a Workspace Settings tab.
- **Pending Invitations:** useful disclosure; expiring and mismatched invites
  should remain visible.
- **AI Settings:** readiness and credential provenance are excellent; saved and
  dirty state must remain visible on the long page.
- **Workspace Settings:** careful danger zone; the page combines too many
  unrelated responsibilities.
- **MCP Registries Deep Link:** scrolling directly to the section can remove
  route orientation from the viewport.
- **Account Settings:** readable inventory; unavailable security controls need
  ownership or remediation paths.

### Phase 6: Agent operations

- **Agent Chat:** strong prompts and approval reassurance; New Chat duplicates
  the empty-state purpose and narrow controls overflow.
- **Agent MCP Servers:** useful empty-state teaching; a six-cell zero summary is
  unnecessary.
- **Agent Skills:** readable; assistant visibility and enabled state need
  clearer distinction.
- **Agent Tools:** capability semantics are strong; mutation consequences and
  feedback need greater visibility.
- **Agent Settings:** good Disable and Delete copy; show workflow-assignment
  impact before disabling.

### Phase 7: Kubernetes operations

- **Overview and Health:** issue-first and trustworthy; two-point charts and
  equal-weight metrics overstate thin evidence.
- **Resources:** strong grouping; fix the skipped heading level, excessive line
  length, and dense discovery controls.
- **MCP Servers:** clear governance; summary strip contains more facts than the
  decision requires.
- **Skills:** clean inventory; summary repeats table information.
- **Tools:** good capability labels; repeated provider badges add noise.
- **Chat:** focused transcript; narrow rail, run metadata, and composer need a
  mobile redesign.
- **Settings:** good identity and scope grouping; auto-triage recovery is vague.

### Phase 8: Virtual machine operations

- **Overview:** strong issue-first start; duplicated empty charts and metric
  cards create artificial density.
- **All Resources:** clean ledger; generic category and detail cells carry
  little operational value.
- **Services, Processes, Network, Logs:** legitimate routes without canonical
  visual coverage. Each needs empty, populated, long-content, and failure
  states.
- **MCP Servers, Skills, Tools:** inherit the repeated capability-summary issue.
- **Chat:** inherits the narrow-screen chat failures.
- **Settings:** reads as status inventory while the title promises editable
  settings.

## Automated Detector Findings

The static detector returned one warning in `src/styles.css` for the Tailwind
mono-font expression. It is a false positive because the Tailwind preset
resolves the expression to Ubuntu Mono, which `DESIGN.md` documents.

Five live pages produced 35 highlighted elements and 41 finding instances:

- 10 layout-transition instances.
- 5 text-overflow instances.
- 5 cream-palette instances.
- 11 nested-card instances.
- 8 cramped-padding instances.
- 1 excessive line-length instance.
- 1 skipped-heading instance.

Cream-palette, most nested-card, and cramped-padding findings are detector
classification errors against intentional ledger structures. The actionable
findings are the Kubernetes resource heading and line length, undiscoverable
full account identity when truncated, and observation of the documented
sidebar width transition. No unexpected application errors occurred.

## Persona Risks

- **Power user:** limited bulk operations, card-based Agent comparison, and
  actions hidden in overflow menus slow repeated work.
- **Accessibility-dependent user:** skipped heading hierarchy, clipped narrow
  layouts, and undiscoverable truncated identity impair non-visual and zoomed
  use.
- **Mobile user:** clipped approval decisions, overflowing chat controls, and
  top-heavy actions make interruption-prone tasks unreliable.

## Completion Interpretation

A numerical score alone does not close this baseline. Closure also requires:

- Every finding above is resolved or explicitly proven to be a non-actionable
  detector limitation.
- Fresh critique and audit runs use the complete route and state inventory.
- Scores are not raised by suppressing rules, weakening fixtures, hiding
  content, or accepting snapshots without visual inspection.
- Existing product boundaries, accessibility, routing, API contracts,
  observability, i18n, and performance budgets remain intact.
