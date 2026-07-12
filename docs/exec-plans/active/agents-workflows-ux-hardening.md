# Agents and Workflows UX Hardening

## Goal

Make the Agents and Workflows surfaces shareable, narrow-screen safe, guided,
permission-aware, and bilingual while consuming the additive control-plane
catalog, pagination, and schedule-preview contracts.

## UX Acceptance Criteria

- URL parameters restore selected resources, tabs, filters, and drawers.
- Closing a drawer removes only its panel-specific parameters.
- Agent inspection uses one stable profile workspace with Overview,
  Capabilities, Activity, and Versions tabs. Optional test runs live in Activity
  and do not gate assignment.
- Agent catalog state comes only from the control-plane statuses `active`,
  `draft`, and `disabled`; readiness terminology and locally derived health are
  not part of the Agents UI.
- Schedule creation leads with frequency, time, weekdays, timezone, typed
  inputs, context grants, and a readable server preview; cron and JSON are
  synchronized advanced controls.
- A 390px viewport has no page-level horizontal overflow.
- Unavailable catalogs, loading, retry, permission, and mutation states explain
  the next action in English and Mandarin.

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
