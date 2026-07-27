# Issue and Workflow Release Readiness

## Goal

Bring the pending-issue, workflow-activity, and manual-assistant UI changes to a
production-release standard without expanding the feature or changing trigger
semantics.

## Scope

- Audit the complete local diff for behavioral, contract, accessibility,
  responsive, localization, and fixture consistency.
- Tighten implementation and tests where the current evidence is ambiguous or
  brittle.
- Exercise the operator path and required repository validation gates.

## Constraints

- Limit the shorter `Events` wording to the trigger tab.
- Do not correlate assistant conversations with workflow executions.
- Do not change backend event-trigger contracts or dispatch behavior.
- Keep fresh Pending resources observable without promoting them to durable
  issues.
- Reuse existing components and design-system conventions.

## Release Gates

- Focused unit and fixture-contract tests pass.
- Full repository validation passes in control-plane mode.
- In-app browser verification covers representative desktop and compact
  layouts, assistant opening, Pending visibility, and failure states.
- The final diff is focused, documented, and free of formatting errors.

## Outcome

- Kept assistant actions distinct from related workflow activity across
  Kubernetes, VM, and workspace overview surfaces.
- Shortened only the trigger tab to `Events` and preserved all trigger/dispatch
  contracts and other source-specific copy.
- Added explicit scope and namespace context to Kubernetes issue prompts without
  correlating conversations to workflow runs.
- Kept fresh Pending pods visible as resources without presenting them as
  durable issues.
- Hardened responsive cards, count grammar, heading semantics, icon
  accessibility, fixture consistency, and failure-state coverage.

## Verification

- `env VITE_APP_DATA_MODE=control-plane npm run validate` passed.
- 697 Vitest tests, 19 design-browser tests with one intentional skip, 171
  repeated fixture tests, and 21 repeated MCP-parity tests passed.
- Membership, contracts, harness, production build, and route smoke passed.
- Focused operator Playwright coverage passed 9 tests.
- In-app browser inspection at 1280x720 confirmed no horizontal overflow on
  cluster or VM overview and verified the assistant prompt contains exact Pod
  scope and namespace.
