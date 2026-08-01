# Workflow Activity Visibility

Workflow activity is a workspace-wide operational concern. Operators should be
able to answer three questions without opening each workflow:

1. Is automation running or waiting for me?
2. What started it?
3. Where do I inspect the exact run?

## Information Architecture

Workflows is one route family with four first-class tabs: **All Workflows**,
**Schedules**, **Incoming Webhooks**, and **Activity**. Each tab retains its own
route, page header, discovery controls, and shareable state.

Inside a selected workflow, **Overview**, **Agents**, **Capabilities**, **Runs**,
and **Settings** are visible route-backed tabs. Exact-run links select the Runs
tab and focus the matching execution in that panel. Text-labelled Edit,
Schedules, Webhooks, and Launch or Activate actions sit below the workflow
description without hiding the five-tab structure. Schedules and Webhooks open
their filtered drawers; creation begins from each drawer's Create action.

Outbound webhooks remain a separate Automation destination because they deliver
AcornOps events to another system; they do not start workflows. Schedules and
incoming webhooks have first-class top-level tabs and may also be managed from
workflow-filtered drawer tables. Create actions open modal forms above those
drawers. Existing schedule, incoming webhook, and `tab=` deep links remain
navigation contracts.

## Execution Model

The UI keeps these facts separate:

- **Configuration** says whether a schedule or workflow webhook is enabled, paused, or
  auto-paused.
- **Last dispatch** says whether the latest attempt was dispatched, skipped,
  rejected, failed, or auto-paused.
- **Latest execution** shows the actual execution lifecycle when dispatch
  created one.

A dispatch failure never renders as a running execution. A failed dispatch also
does not erase the last successful execution pointer. The aggregate execution
status is authoritative across the ledger, issue rows, webhook rows, and
workflow run detail.

Every execution displays a safe, immutable origin snapshot. Manual, external
integration, schedule, webhook, and retained historical-event origins remain
identifiable after a configuration is deleted. The console never displays
webhook payloads or raw occurrence keys as provenance.

## Operator Surfaces

The Activity tab shows open executions; the Workflows navigation item carries
the Experimental badge. The Activity ledger defaults to open work
and supports URL-backed search, state, origin, and workflow filters. Rows show
workflow and origin, workspace scope, lifecycle time, honest duration, and one
exact-run action. Exact links open the existing
workflow-scoped Runs tab and focus the matching execution. The
`tab=runs` URL value remains the compatibility contract for those links.

## Collection Behavior

The workspace Activity, Schedules, Incoming Webhooks, and Outbound Webhooks
routes use the shared page header and discovery
bar. Workflow-scoped schedule and webhook drawers omit redundant discovery
controls and lead with a compact table already filtered to the selected
workflow.

Desktop ledgers retain concise, single-line column headings during loading,
error, empty, filtered-empty, and populated states. Compact layouts replace
desktop columns with labeled cards. Populated ledgers end after their final row;
only loading and state messages reserve enough height to remain legible.
Desktop rows do not repeat labels already supplied by the column headings.
Dense three-filter toolbars remain stacked until the viewport can accommodate
the sidebar and every control without clipping.

Outbound-webhook discovery stays visible while loading, when items exist, or
when URL filters are active. It is omitted for a confirmed empty, unfiltered
collection because there is nothing to search.

Workflow creation uses two steps: describe the workflow, then select its agents.
There is no read-only review step; the final button summarizes the real commit
point. The Settings and Agents tabs open directly in actionable form for
authorized operators. These surfaces retain Cancel or Back actions without
nesting a second edit mode inside a task drawer.
Workflow prompts are plain text: workflow authoring and launch do not provide
runtime template parameters or bound prompt-reference insertion. Workflow prompt
fields may insert plain-text `@target[Target name]` mentions through autocomplete. Schedule and incoming
webhook creation use compact, medium-width modal forms above their parent drawer
so operators retain the selected workflow as context.

## Refresh and Accessibility

One workspace activity store fetches navigation counts on workspace entry,
polls every two seconds while the document is visible, and refreshes on window
focus or visibility restoration. A failed refresh preserves the last successful
counts and exposes a persistent warning on Activity.

The polite live region announces newly discovered runs and increases in
attention-required work. Routine refreshes are silent. Status always combines
text with semantic tone, active motion is limited to execution indicators, and
reduced-motion preferences disable that animation. Relative timestamps retain
their absolute value in the `title` and `dateTime` attributes.

## Fixture Coverage

Mock mode includes scheduled running, issue-triggered running,
waiting-for-approval, needs-review, multiple executions for one issue,
completed, failed, failed dispatch without execution, and deleted-trigger
provenance examples. Browser coverage checks desktop headings, compact reflow,
search behavior, empty states, exact-run focus, and horizontal overflow.
