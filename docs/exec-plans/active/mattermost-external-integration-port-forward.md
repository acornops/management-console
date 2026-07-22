# Mattermost External Integration Port Forward

## Goal

Port Ryan Goh's four cumulative management-console pull requests (#12, #13,
#14, and #16) onto the current console through `temp-main`, preserving the
original commits while implementing the external integration controls inside
the newer route, catalog, workflow, target, authentication, and data layers.

Central tracking: acornops/acornops#12.

## Constraints

- Merge existing PR commits; do not squash, rebase, cherry-pick, or force-push.
- Preserve the current component and routing architecture, unified catalog and
  workflow surfaces, OIDC logout behavior, validated AI return paths,
  optimistic run handling, responsive design system, and refactored tests.
- Do not restore obsolete whole-page implementations from the old branches.
  Re-express grants, webhook controls, delivery status, and write-run UX as
  focused additions to current screens and services.
- Consume only control-plane endpoints documented in the synchronized contract
  manifest. Keep authorization errors and unavailable capabilities explicit.
- Validate both control-plane data mode and responsive browser behavior.

## Wave Scope

1. External account linking and workspace grant management.
2. Workflow/session access and webhook connection management.
3. Durable issue delivery lifecycle and status/history visibility.
4. Write-run execution and approval interaction.

## Decision Log

- 2026-07-22: `temp-main` was created from management-console `main` at
  `0e052aa`.
- 2026-07-22: Existing PRs remain the integration vehicles for original commit
  attribution.
- 2026-07-22: Current UI architecture and contracts win every conflict; legacy
  PR screens are design references, not authoritative replacements.

## Validation Log

- Baseline: design checks, TypeScript, and 587 unit tests passed in
  control-plane data mode. The real-Chrome design suite passed 19 tests in the
  combined run; the interrupted final existing case passed independently.
- Each wave: run focused component/service tests, contract checks, design-system
  checks, control-plane-mode validation, production build, and route smoke.
- Final: verify linking, grants, webhook lifecycle, executions, SSE status, and
  approvals against the integrated control plane and Mattermost bot.

## Completion Criteria

- PRs #12, #13, #14, and #16 are merged with merge commits into `temp-main` in
  order, with Ryan's commits reachable.
- Current console behavior and design invariants remain green.
- A draft `temp-main` to `main` PR is ready for manual review and not
  automatically merged.
