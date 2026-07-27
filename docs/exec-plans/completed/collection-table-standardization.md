# Collection Table Standardization

Status: Completed on July 27, 2026.

## Goal

Make operator-facing collection tables read as one AcornOps system by extracting
the strongest parts of the Kubernetes MCP Servers table into shared semantic and
responsive-grid primitives, then migrating the relevant routes without changing
their data, permissions, actions, or responsive information architecture.

## Scope

- Define one shared semantic header row and header-cell vocabulary plus a
  parallel responsive-grid header vocabulary.
- Use the MCP Servers table as the visual reference for label hierarchy,
  breathing room, border treatment, and action-column alignment.
- Migrate MCP Servers, target Skills, target Tools, Runs, Schedules, Event
  Triggers, Outbound Webhooks, Approvals, Audit Log, and Members.
- Keep compact diagnostic sub-tables feature-owned where the collection-header
  vocabulary would reduce useful density or change semantics.
- Preserve expandable webhook history, compact cards, horizontal overflow,
  sticky headers, loading and empty states, URL-backed filters, focus handling,
  permissions, and control-plane boundaries.
- Keep chart accessibility tables and rendered Markdown tables out of scope
  because they have different presentation and assistive-technology roles.

## UX Acceptance Criteria

- Desktop collection headers use the same surface, label role, responsive
  padding, border, and action alignment.
- Semantic tables and responsive grid-ledgers share the same visible header
  anatomy.
- Rows align with their headers and retain feature-appropriate content density.
- Compact layouts remain readable without horizontal clipping unless the
  feature intentionally uses a horizontally scrollable dense table.
- Expandable details, menus, switches, approval actions, and keyboard focus
  behavior remain unchanged.
- Loading, empty, filtered-empty, refresh, error, and permission states remain
  distinct and accessible.
- Light and dark themes continue to resolve entirely through existing tokens.

## Validation Plan

- Add component tests for the canonical table and grid-header primitives.
- Add source-contract coverage that prevents migrated surfaces from returning
  to local header anatomy.
- Run focused unit tests for shared tables and affected collection behavior.
- Verify each fixture-backed route at desktop and compact widths in the in-app
  browser, including expandable webhook history and representative action menus.
- Run `VITE_APP_DATA_MODE=control-plane npm run validate`.
- Finish with `git diff --check`, changed-file review, and stale-artifact scan.

## Validation Log

- Added shared semantic and responsive-grid header primitives with standard and
  dense spacing contracts, plus source-level regression coverage for every
  migrated collection.
- Migrated MCP Servers, Skills, Tools, Runs, Schedules, Event Triggers,
  Outbound Webhooks, Approvals, Audit Log, and Members. Preserved compact
  diagnostic and chart tables as intentional feature-owned exceptions.
- Verified fixture-backed MCP Servers, Skills, Tools, Runs, Schedules, Event
  Triggers, Outbound Webhooks, Audit Log, and Members in the in-app browser at
  wide and compact widths. Verified webhook action/history expansion plus Audit
  and Member detail panels.
- Browser review caught and resolved an over-constrained Webhooks grid, cramped
  Audit and Members tablet columns, and a premature seven-column Schedules
  breakpoint.
- Inspected regenerated light/dark desktop/mobile catalog snapshots before
  accepting the updated baselines.
- `npm run lint`: passed.
- Focused Vitest suite: 48 tests passed.
- Focused fixture and MCP parity tests for the revised Schedules breakpoint:
  passed.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed end to end,
  including 686 Vitest tests, 19 Playwright design-system tests (1 intentionally
  skipped), 162 repeated fixture tests, 21 repeated MCP parity tests, membership,
  contract and harness checks, production build, and route smoke checks.
