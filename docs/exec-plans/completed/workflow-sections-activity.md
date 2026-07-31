# Workflow sections and Activity

## Goal

Make Workflows a route-backed three-tab surface for All Workflows, Schedules,
and Incoming Webhooks, and promote workspace Activity to first-class Automation
navigation while retaining workflow-scoped Activity in workflow details.

## Constraints

- Preserve shareable URL state and base-path behavior.
- Redirect legacy Runs and Triggers routes without preserving retired screen
  implementations.
- Keep low-level run API terminology inside the client boundary.
- Use the established tab, ledger, drawer, and empty-state components.
- Keep all webhook secrets write-only and one-time disclosed.

## Validation plan

- Targeted route, navigation, workflow section, Activity, schedule, and webhook
  tests in control-plane data mode.
- `npm run validate`
- Workspace platform-contract check with the coordinated producer and docs
  worktrees.

## Completion criteria

- Workflows has All Workflows, Schedules, and Incoming Webhooks tabs.
- Activity is a top-level Automation destination.
- Legacy Runs redirects to Activity; legacy Triggers and event-triggers routes
  redirect to the appropriate Workflows tab.
- AcornOps Events and the standalone Triggers page are absent.
