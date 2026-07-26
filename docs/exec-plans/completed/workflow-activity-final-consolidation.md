# Workflow Activity Final Consolidation

## Goal

Finish the workflow-activity branch as one cohesive operator-console change:
standardize the surviving UI patterns, remove superseded code and tests, and
bring durable documentation in line with the implemented navigation, activity,
trigger, and issue workflows.

## Audit

- Compare the branch diff against current application primitives and page
  conventions.
- Browser-review Workflows, Runs, Triggers, Outbound Webhooks, workspace
  overview, Kubernetes issues, and virtual-machine issues at desktop and compact
  widths.
- Trace every new component, helper, fixture route, translation key, contract
  entry, and test to a production consumer.
- Search documentation for removed routes, four-tab workflow navigation,
  schedule/event-trigger separation, and stale run terminology.

## Consolidation

- Keep only behavior that directly supports operator awareness, navigation, and
  actionability.
- Remove duplicate tests, stale translation keys, superseded route aliases, and
  unused presentation helpers where compatibility is not required.
- Preserve distinct domain facts: trigger configuration, dispatch outcome, and
  execution lifecycle.
- Use existing page composition, discovery, status, action, and responsive
  patterns consistently.

## Documentation

- Update navigation and interaction documentation for Library, Runs, and
  Triggers.
- Document outbound webhooks as a separate automation destination.
- Document execution visibility on workspace and issue surfaces, exact-run deep
  links, and discovery/empty-state behavior.
- Update docs indexes and maintenance/quality notes only where the durable
  repository record changes.

## Validation

- Focused source and browser tests for every changed behavior.
- Unused-code, translation, route, contract, and harness checks.
- Control-plane-mode validation for contract-sensitive surfaces.
- Full `npm run validate`.

## Outcome

- Browser-reviewed the workspace overview, Runs, all three trigger types, and
  outbound webhooks at desktop and compact widths. Dense three-filter discovery
  remains stacked until `2xl`; measured content at 1280 px stays within the
  viewport.
- Removed unused execution exports and copy, a legacy provenance fallback, its
  legacy-row test, redundant source-inspection assertions, an untracked page
  test superseded by browser coverage, and four superseded draft plans.
- Replaced structural assertions with behavior coverage for retained ledger
  headings, filtered-empty states, compact search, and exact-run focus.
- Added durable console, control-plane, contract, OpenAPI, and user-facing
  automation documentation. All documentation indexes and manifests reference
  the final three-view Workflow information architecture.

## Validation Log

- Management console focused suite: 31 tests passed across six files.
- Management console full validation: 665 unit tests, 19 design-system browser
  checks with one intentional skip, 162 repeated fixture checks, 21 repeated
  MCP-parity checks, membership, contracts, harness, production build, and
  route smoke all passed.
- Management console control-plane mode: production build and route smoke
  passed.
- Control plane: typecheck, style, focused workflow-activity tests, 959 of 961
  tests in the full database-backed run, migrations, authorization, membership,
  run-event durability, contracts, public and admin OpenAPI, harness, and build
  passed. The remaining two tests encountered PostgreSQL `57P03` while the
  temporary validation container recovered from an isolated server-process
  restart; both passed in an immediate isolated rerun.
- Documentation website: navigation check, production validation, and link
  check passed.
- Final `git diff --check` passed in all three repositories.
