# Simple Fetch Tool UI

## Goal

Configure the workflow-only `http.fetch.get` workspace-native tool from the
existing Agent Tools tab with a fixed GET method and one to 20 full HTTPS URL
patterns.

## Work

- Extend Agent and native-tool API types with configuration fields.
- Add the accessible Fetch configuration drawer.
- Preserve existing native-tool grant/revoke behavior for non-configurable tools.
- Add URL validation and native-tool API request regression tests.

## Constraints

- Keep Fetch in the existing Agent Tools tab.
- Show a fixed disabled GET method and repeatable full-URL inputs only.
- Use the existing right-side panel and neutral routine-action controls.
- Preserve server-authoritative validation and bodyless grants for existing
  native tools.

## Decision Log

- Saving the drawer grants Fetch when absent and updates its configuration when
  already granted.
- Revoke remains a separate row action and the returned Agent DTO immediately
  replaces local tool IDs and configurations.
- The existing side panel supplies modal focus trapping, escape handling, and
  focus restoration; the first URL receives initial focus.
- Native-tool rows omit invocation-scope badges; Fetch keeps Grant/Revoke beside
  a labelled settings action that opens the configuration drawer.
- The Fetch drawer is portaled to the document body so it covers the full
  viewport instead of inheriting the Agent drawer's transformed boundary.

## Validation

- `npm run lint`, `npm run contracts:check`, `npm run design:check`,
  `npm run membership:check`, and `npm run harness:check` passed.
- The full unit suite passed (623 tests), the fixture browser suite passed
  (129 tests), and the MCP parity browser suite passed (21 tests).
- Visual regression checks passed (19 tests, with one expected skip).
- Focused Fetch/API and Workflow capability tests passed (18 tests).
- The production build and route smoke checks passed.
- The running local console was checked in the in-app browser for drawer
  coverage, row actions, descriptions, and removed scope badges.

## Completion Criteria

- Users with `manage_agents` can configure, update, reload, and revoke one Fetch
  tool with one to 20 validated URLs without visiting a separate connection
  surface.
