# Workspace Navigation

Workspace navigation is one route-stable system rendered in the 256px desktop
sidebar and the mobile drawer. Both surfaces consume the same permission-aware
model, so labels, grouping, ordering, active state, and governance visibility do
not drift.

## Hierarchy

- Overview is the explicit workspace landing destination.
- Inventory contains Kubernetes Clusters and Virtual Machines.
- Automation keeps Agents, Workflows, Activity, and Outbound webhooks adjacent.
  Workflows exposes All Workflows, Schedules, and Incoming Webhooks as
  route-level tabs, while Activity is a first-class workspace destination.
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
behavior. Keep workflow, activity, webhook, approval, and schedule-creation URLs
directly shareable. `/workflows/schedules` and `/workflows/incoming-webhooks`
activate the Workflows destination and its matching tab. Legacy `/runs`,
`/triggers`, `/schedules`, and `/event-triggers` URLs redirect to Activity or
the appropriate Workflows tab.

`/webhooks` remains a stable workspace route, but its navigation owner is
Automation rather than Workspace Settings. The user-facing label is Outbound
webhooks so it cannot be confused with Incoming webhook triggers.

Only the active destination or workflow tab uses `aria-current="page"`. Desktop and mobile
navigation regions have accessible labels. The workspace switcher keeps a
descriptive accessible name, clamps long names to two lines, and restores focus
after Escape closes its popover.

## Density and State

Desktop destination rows are 40px; mobile targets are at least 44px. Icons are
18px with 12px between icon and label. Active rows use a quiet tonal surface,
ink-weight label, and orange icon. Hover is warm neutral; the orange ring is for
keyboard focus.

State changes are immediate with a 160ms color transition. Reduced-motion users
receive zero-duration transitions. Do not add a sliding active marker.

## Operational Signals

Approvals may show the normalized workspace pending count. Hide the badge when
the count is zero or unavailable, show 1 through 99 exactly, and cap higher
values at `99+` while retaining the exact accessible label. Reserve badge space
so polling cannot shift labels or row height. The shell refreshes immediately on
workspace changes and approval decisions, every 30 seconds while visible, and
on window focus. A transient request failure keeps the last successful value.

Activity may show the normalized open-execution count using the same badge
rules. The shared workflow activity store refreshes the count on workspace
entry, every two seconds while visible, and on focus. Attention-required detail
belongs inside Activity and issue context rather than a second navigation badge.
