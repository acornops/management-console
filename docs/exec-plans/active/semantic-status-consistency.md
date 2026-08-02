# Semantic Status Consistency

## Goal

Make status pills, semantic callouts, and destructive confirmations use one
predictable visual vocabulary across the management console.

## Rules

- Status pills use the shared borderless `StatusBadge` anatomy.
- Semantic callouts use `InlineAlert`: full border, semantic soft fill,
  semantic text, and a leading icon.
- Pre-destructive consequence copy uses warning orange.
- Mutation errors, danger-zone affordances, and destructive confirmation
  buttons remain danger red.
- Counters, metadata tags, icon indicators, and interactive controls are not
  status pills and may retain their own reviewed boundaries.

## Scope

- Approval checkpoint and Kubernetes workload status pills.
- Workspace member candidate status pills.
- Cluster, VM, workspace, workflow, conversation, schedule, and webhook delete
  confirmation guidance.
- Modal Agent, capability, integration, and member removal confirmations.
- Removal of unused VM status-class helpers that preserve the obsolete
  outlined-pill treatment.

## Validation

- Add focused source and rendering tests for shared status and destructive
  confirmation anatomy.
- Run affected Vitest suites.
- Run the workspace overview and relevant design-system browser coverage.
- Run `npm run validate`, recording any unrelated dirty-worktree blocker.

## Completion Criteria

- No production status pill in scope rebuilds an outlined semantic badge.
- Destructive consequence guidance is orange in every migrated confirmation.
- Mutation errors and destructive buttons remain red.
- Shared UI and application typechecks, targeted tests, and affected browser
  routes pass.
