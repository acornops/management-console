# Agents and Workflows UX Hardening

## Goal

Make the Agents and Workflows surfaces shareable, narrow-screen safe, guided,
permission-aware, and bilingual while consuming the additive control-plane
catalog, pagination, and schedule-preview contracts.

## UX Acceptance Criteria

- URL parameters restore selected resources, filters, and drawers.
- Workflows exposes All Workflows, Schedules, Incoming Webhooks, and Activity as
  route-backed top-level tabs.
- Workflow detail exposes Overview, Agents, Capabilities, Runs, and Settings as
  route-backed inline tabs, including compatibility with existing `tab=` links.
- The workflow header exposes text-labelled Edit, Schedules, Webhooks, and
  Launch or Activate actions in a separate row below the workflow description.
- Workflow-filtered schedule and webhook drawers lead with compact tables.
  Create actions open bounded, medium-width modal forms above the drawer.
- Workflow prompts are plain text. Authoring, launch, schedules, and incoming
  webhooks expose no runtime template parameters, values, or prompt-reference
  insertion.
- Workflow creation has two decision-bearing steps, Describe and Agents.
  Settings and agent assignment tabs open directly in their actionable state
  for authorized operators rather than nesting another edit mode.
- Compact workflow detail hides collection-only section and discovery chrome
  until Back returns to the workflow library.
- Desktop Workflows keeps its route canvas fixed while the compact workflow
  library, selected Overview body, and workspace Activity ledger scroll in
  their relevant view. Compact viewports retain natural page scrolling.
- Workflow status, ownership, title, description, and launch actions fit in a
  shallow desktop header without reducing the shared action target sizes.
- Closing a contextual schedule or webhook drawer removes only its
  panel-specific parameters.
- Agent inspection uses one stable profile workspace with Overview,
  Capabilities and Settings tabs. Disable and delete actions
  appear only in Settings.
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
- Agents are ordinary workspace-owned definitions with the same edit, restore,
  duplicate, disable, and delete rules.
- Default and recommended workflows are ordinary workspace-owned definitions.
  They are directly editable and AcornOps never overwrites, upgrades, or
  automatically restores them.
- Agent deletion explains dependent workflows, and managed-response workflows
  label the hidden entry Agent as an AcornOps-managed coordinator without
  exposing its ID.
- The disconnected workflow scope editor and its update action remain removed.
  The `tab=` parser selects the five visible workflow detail panels.

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

- `VITE_APP_DATA_MODE=control-plane npm run validate` passed: 126 Vitest files
  and 672 tests, 19 Playwright design tests with one expected skip, 162 repeated
  standalone fixture checks, 21 repeated control-plane parity checks,
  membership/contracts/harness checks, production build, and route smoke.
- Live local verification confirmed workspace ownership labels, the canonical
  `panel=recommendations` route, compatibility with legacy `panel=templates`
  links, localized recommendation status labels, and route cleanup on close.
- The production output contains no MSW fixture chunk. A production build with
  `VITE_APP_DATA_MODE=mock` is rejected with the configured startup error.
