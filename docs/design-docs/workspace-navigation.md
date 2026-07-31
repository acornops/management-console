# Workspace Navigation

Workspace navigation is one route-stable system rendered in a `256px` expanded
desktop sidebar, a `64px` collapsed desktop rail, and a left overlay drawer.
Persistent navigation begins at `1200px`; below it, the `64px` top bar opens a
drawer sized `min(80vw, 320px)`. All surfaces consume the same permission-aware
model, so labels, grouping, ordering, active state, and governance visibility do
not drift.

## Hierarchy

- Overview is the explicit workspace landing destination.
- Inventory contains Kubernetes Clusters and Virtual Machines.
- Automation keeps Agents and Workflows adjacent, followed by Outbound webhooks
  as the workspace event-delivery destination. Workflows exposes Library, Runs,
  and Triggers as its route-level views.
- Governance contains Approvals for workspace-data readers and Audit Log for
  audit-log readers. Omit the group when neither destination is permitted.
- Utilities contains Workspace Settings and Help and is visually separated from
  governance.
- Account controls remain pinned outside the independently scrolling navigation.
- Navigation overflow remains available to wheel, touch, and keyboard input, but
  desktop and mobile navigation do not display scrollbar chrome.

## Route and Link Rules

Every destination is a genuine, base-path-aware anchor. Unmodified same-tab
clicks use client navigation; modified clicks and open-in-new-tab retain browser
behavior. Keep workflow, run, trigger, approval, and schedule-creation URLs
directly shareable. `/workflows`, `/runs`, and `/triggers` activate the same
sidebar destination, and workflow-route navigation exposes
`Library | Runs | Triggers`.

`/webhooks` remains a stable workspace route, but its navigation owner is
Automation rather than Workspace Settings. The user-facing label is Outbound
webhooks so it cannot be confused with Incoming webhook triggers.

Only the active destination uses `aria-current="page"`. Desktop and mobile
navigation regions have accessible labels. The workspace switcher keeps a
descriptive accessible name, clamps long names to two lines, and restores focus
after Escape closes its popover.

The desktop collapse toggle remains mounted across modes, identifies the
navigation with `aria-controls`, reports the expanded state with
`aria-expanded`, uses translated expand/collapse labels, and retains keyboard
focus. The mode is stored per authenticated profile as `sidebar_mode`;
`expanded` is the default for missing, invalid, anonymous, or unavailable
storage. Opening the temporary drawer never changes it.

In the rail, labels and section headings remain accessible but are visually
hidden. Right-side tooltips appear on hover and focus. Workspace and account
panels open to the rail's right and stay within the viewport. Workflow child
views remain available through route tabs. Resizing an open drawer to `1200px`
closes it and releases focus isolation and scroll locking; returning below the
breakpoint does not alter the persisted desktop mode.

## Density and State

Desktop destination rows are 40px; mobile targets are at least 44px. Icons are
18px with 12px between icon and label. Active rows use a quiet tonal surface,
ink-weight label, and orange icon. Hover is warm neutral; the orange ring is for
keyboard focus.

State changes use a 160ms color transition. Sidebar width and drawer transforms
use 160–200ms with the ease-out-quint curve. Reduced-motion users receive
zero-duration spatial transitions. Do not add a sliding active marker.

Docked assistant limits use the active `256px` or `64px` desktop width so the
main route retains its required `560px` allowance.

## Operational Signals

Approvals may show the normalized workspace pending count. Hide the badge when
the count is zero or unavailable, show 1 through 99 exactly, and cap higher
values at `99+` while retaining the exact accessible label. Reserve badge space
so polling cannot shift labels or row height. The shell refreshes immediately on
workspace changes and approval decisions, every 30 seconds while visible, and
on window focus. A transient request failure keeps the last successful value.

Workflows and its Runs child may show the normalized open-execution count using
the same badge rules. The shared workflow activity store refreshes the count on
workspace entry, every two seconds while visible, and on focus. The parent badge
keeps active work visible when the child links are collapsed; the child badge
locates the ledger once Workflows is expanded. Attention-required detail belongs
inside Runs and issue context rather than a second navigation badge.

## Cross-Console Alignment

Any AcornOps console claiming management-console shell alignment, including the
platform admin console, must adopt this breakpoint, sizing, persistence, focus,
motion, and link contract unless its own requirements explicitly document a
divergence.
