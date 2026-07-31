# Workflow Activity Visibility

Workflow activity is a workspace-wide operational concern. Operators should be
able to answer three questions without opening each workflow:

1. Is automation running or waiting for me?
2. What started it?
3. Where do I inspect the exact run?

## Information Architecture

Workflows is one definition workspace. The selected workflow's Overview remains
visible as the stable canvas; Run activity, Schedules, Incoming webhooks, Edit,
and Launch open focused task drawers from its compact action group. Operational
views are visually grouped separately from definition and launch actions.

**Activity** is the second view inside the Workflows destination and owns the
workspace execution ledger. A compact, route-backed view switch changes between
**Show workflows** and **Show activity** without adding another global navigation
destination. On desktop the switch occupies an `18rem` rail aligned beside the
active view's search and filters; compact layouts stack the controls. A workflow's
**Run activity** action opens the same run detail in a
workflow-scoped drawer without replacing Overview.

Outbound webhooks remain a separate Automation destination because they deliver
AcornOps events to another system; they do not start workflows. Schedules and
incoming webhooks are managed from workflow-filtered drawer tables. Create
actions open modal forms above those drawers. Existing schedule, incoming
webhook, and `tab=` deep links remain compatibility contracts, but they do not
render navigation tabs.

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

The in-page Activity view tab shows open executions; the Workflows navigation
item carries the Experimental badge. The Activity ledger defaults to open work
and supports URL-backed search, state, origin,
workflow, and issue filters. Rows show workflow and origin, target, lifecycle
time, honest duration, and one exact-run action. Exact links open the existing
workflow-scoped Run activity drawer and focus the matching execution. The
`tab=runs` URL value remains the compatibility contract for those links.

Workspace, Kubernetes, and virtual-machine issue rows show the most relevant
execution with its origin and current state. Their primary action follows this
order:

1. Waiting for approval or needs review: **Review run**.
2. More than one open execution: **View runs** with the issue filter applied.
3. One open execution: **Open run**.
4. Failed latest automation: **Review failure**.
5. Completed latest automation: **View history**.

Manual investigation remains available. Automation visibility adds context and
a direct next step; it does not replace operator judgment.

## Collection Behavior

The workspace Activity ledger and compatibility Schedules, Incoming Webhooks,
and Outbound Webhooks routes use the shared page header and discovery
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
point. The edit drawer also opens directly in editable form, and authorized
operators enter agent selection directly from Overview. These surfaces retain
Cancel or Back actions without nesting a second edit mode inside a task drawer.
Workflow prompts are plain text: workflow authoring and launch do not provide
runtime template parameters or prompt-reference insertion. Schedule and incoming
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
