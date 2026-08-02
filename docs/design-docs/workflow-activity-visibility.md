# Workflow Activity Visibility

Workflow activity is a workspace-wide operational concern. Operators should be
able to answer three questions without opening each workflow:

1. Is automation running or waiting for me?
2. What started it?
3. Where do I inspect the exact run?

## Information Architecture

Workflows is one route family with three first-class workspace tabs:
**Workflows**, **Schedules**, and **Runs**. Each tab retains its own route, page
header, discovery controls, and shareable state.

Inside a selected workflow, **Overview**, **Capabilities**, **Schedules**,
**Webhooks**, and **Runs** are visible route-backed tabs. Overview contains the
Agent assignment summary and editor, while Settings remains route-backed behind
Edit. Exact-run links select the Runs tab and focus the matching execution in
that panel. Only immediate Edit and Launch or Activate actions sit below the
workflow description. Schedules and Webhooks render their workflow-filtered
management tables in the detail pane; creation begins from each tab's Create
action.

Outbound webhooks remain a separate Automation destination because they deliver
AcornOps events to another system; they do not start workflows. Schedules and
inbound webhooks are managed from workflow-filtered detail tabs. Only Schedules
also retains a workspace-level aggregate tab. Create actions open modal forms
above the selected workflow detail. Legacy workflow `panel=schedules`,
`panel=schedule`, and `panel=webhooks` links normalize to the corresponding
route-backed detail tab. The former incoming-webhooks aggregate route remains
available only for bookmarked-link compatibility.

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

Workflow run detail is an inspection surface, not a conversation. It renders
the persisted output, approvals, trace events, and bounded coordination detail,
but it does not expose a message history or instruction composer. Human
operators change future behavior by editing the Workflow and starting a new
run, rather than steering an execution after launch. Each run's persisted
summary starts expanded and can be collapsed independently when an operator
needs to scan several runs.

## Operator Surfaces

The Runs tab shows workspace workflow executions; the Workflows navigation item
carries the Experimental badge. The Runs ledger defaults to all executions so
completed and fast-finishing workflow runs remain visible, and supports
URL-backed search, state, origin, and workflow filters. Rows show
workflow and origin, workspace scope, lifecycle time, honest duration, and one
exact-run action. Exact links open the existing
workflow-scoped Runs tab and focus the matching execution. The
`tab=runs` URL value remains the compatibility contract for those links.

## Collection Behavior

The workspace Runs, Schedules, compatibility Inbound Webhooks, and Webhooks
Webhooks routes use the shared page header and discovery bar. Workflow-scoped
schedule and webhook detail tabs omit redundant discovery controls and lead
with a compact table already filtered to the selected workflow.

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
point. Settings and the Overview Agent assignment section open directly in
actionable form for authorized operators. These surfaces retain Cancel or Back
actions without nesting a second edit mode inside a task drawer.
Workflow prompts are plain text: workflow authoring and launch do not provide
runtime template parameters or bound prompt-reference insertion. Workflow prompt
fields may insert plain-text `@target[Target name]` mentions through autocomplete. Schedule and incoming
webhook creation use compact, medium-width modal forms above their parent detail
tab so operators retain the selected workflow as context.

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
