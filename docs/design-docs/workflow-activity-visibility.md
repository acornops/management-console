# Workflow Activity Visibility

Workflow activity is a workspace-wide operational concern. Operators should be
able to answer three questions without opening each workflow:

1. Is automation running or waiting for me?
2. What started it?
3. Where do I inspect the exact run?

## Information Architecture

Workflows has three route-level sections:

- **All Workflows** owns workflow definitions and manual launch.
- **Schedules** owns recurring workflow dispatch.
- **Incoming Webhooks** owns signed endpoints that dispatch workflows.

**Activity** is a top-level Automation destination and owns the workspace
execution ledger. Workflow details retain their scoped Activity view.

Outbound webhooks remain a separate Automation destination because they deliver
AcornOps events to another system; they do not start workflows. The Workflows
page uses route-backed tabs, keeping the active collection visible as stable
navigation rather than a filter that replaces the table. Schedule and incoming
webhook creation intents are route-backed so workflow-prefilled destinations
open directly and remain resumable.

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

The Activity navigation badge shows open executions. The Activity ledger
defaults to open work and supports URL-backed search, state, origin,
workflow, and issue filters. Rows show workflow and origin, target, lifecycle
time, honest duration, and one exact-run action. Exact links open the existing
workflow Runs panel and focus the matching execution.

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

Activity, Schedules, Incoming Webhooks, and Outbound webhooks use the shared page header and discovery
bar. Search and filters appear directly above the collection, and no inner card
repeats the page title.

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

## Refresh and Accessibility

One workspace activity store fetches navigation counts on workspace entry,
polls every two seconds while the document is visible, and refreshes on window
focus or visibility restoration. A failed refresh preserves the last successful
counts and exposes a persistent warning on Runs.

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
