# Agents and Workflows UX Hardening

## Goal

Make the Agents and Workflows surfaces shareable, narrow-screen safe, guided,
permission-aware, and bilingual while consuming the additive control-plane
catalog, pagination, and schedule-preview contracts.

## UX Acceptance Criteria

- URL parameters restore selected resources, tabs, filters, and drawers.
- Closing a drawer removes only its panel-specific parameters.
- Agent inspection uses one stable profile workspace with Overview,
  Capabilities, Activity, Versions, and Settings tabs. Optional test runs live
  in Activity and do not gate assignment. Disable and delete actions appear
  only in Settings.
- Agent catalog state comes only from the control-plane statuses `active`,
  `draft`, and `disabled`; readiness terminology and locally derived health are
  not part of the Agents UI.
- Schedule creation leads with frequency, time, weekdays, timezone, typed
  inputs, context grants, and a readable server preview; cron and JSON are
  synchronized advanced controls.
- A 390px viewport has no page-level horizontal overflow.
- Unavailable catalogs, loading, retry, permission, and mutation states explain
  the next action in English and Mandarin.
- Agent profile actions use the shared button sizes and refresh icon treatment.
- Template-origin Agents and workflows use compact `Built-in` provenance
  text, never a `TEMPLATE` badge or the installing user's ownership label.
- System-provided definitions expose duplication instead of definition editing;
  workspace availability and supported external bindings remain configurable.
- Visible system-provided definitions expose deletion. Agent deletion explains
  dependent workflows, and managed-response workflows label the hidden entry
  Agent as an AcornOps-managed coordinator without exposing its ID.

## Validation Plan

- Targeted interaction, API-client, responsive, and locale tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`
- Browser checks at 390x844, 768x1024, and 1440x1000 when the local runtime is
  available, including dark mode and reduced motion.

## Completion Criteria

- Deep links and browser navigation restore the visible state.
- Guided and advanced schedule values remain synchronized and validate inline.
- Existing Operator's Ledger components and accessibility behavior are retained.
- Contract manifests match the producer.

## Workspace MCP Repair

- Workspace Settings provides generic HTTP MCP creation, write-only none/bearer/custom-header authentication, connection testing and discovery, tool capability review, enable/disable, and deletion.
- MCP mutations are disabled without `manage_mcp`; workflow capability editing remains governed by `manage_workflows`.
- The Workflows page has no page-wide setup or empty-catalog notices. Request failures remain compact and retryable; MCP/agent availability is handled by the controls that consume it.
- English and Mandarin copy, visible keyboard focus, dark-theme tokens, and narrow-screen stacking are preserved.

## Standalone frontend fixture transport

- `VITE_APP_DATA_MODE` is validated as `mock` or `control-plane`; standalone
  development defaults to `mock`, while production builds default to and
  require `control-plane`.
- Mock mode starts a fail-closed MSW transport before React mounts and keeps UI
  code on the normal control-plane API client and response-mapper boundary.
- The mutable browser store covers representative Kubernetes and VM inventory,
  operations, membership, settings, Agents, Workflows, catalog, sessions, and
  deterministic chat history. Reloading resets the store.
- Unsupported external OAuth, credential, and remote Git operations return an
  explicit fixture-mode error; unmatched API requests cannot reach a live
  control plane.

## Frontend fixture validation evidence

- `VITE_APP_DATA_MODE=control-plane npm run validate` passed: 131 Vitest files
  and 766 tests, 19 Playwright design tests with one expected skip, standalone
  fixture smoke, membership/contracts/harness checks, production build, and
  route smoke.
- The production output contains no MSW fixture chunk. A production build with
  `VITE_APP_DATA_MODE=mock` is rejected with the configured startup error.
