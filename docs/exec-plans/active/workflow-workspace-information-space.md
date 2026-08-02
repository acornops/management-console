# Workflow workspace information space

## Goal

Give the Workflows route family enough room for workflow definitions, runs,
schedules, and incoming webhooks while preserving route-backed state, deliberate
launch guardrails, and compact-screen usability.

## Acceptance criteria

- The selected workflow receives materially more horizontal and vertical space
  at desktop widths than the current baseline.
- Workspace-level navigation and selected-workflow navigation are visibly and
  verbally distinct, with no more than four peer choices in either group.
- Launch readiness and the next recovery action are visible in the workflow
  header before a user opens the launch drawer.
- Overview does not repeat the active tab heading before its operational facts.
- Workflow settings are read-only for users without `manage_workflows`.
- Schedule authoring identifies required fields and save failures accessibly,
  validates timing inputs before mutation, and warns before discarding changes.
- Workflow-filtered schedule and webhook drawers use a compact composition on
  narrow widths instead of requiring horizontal table panning.
- Schedules, incoming webhooks, and workspace runs share the tighter workflow
  route chrome and retain responsive, theme, keyboard, and URL behavior.
- Repeated workflow-name lookup work is constant time for schedule and webhook
  collections.
- One Add workflow menu owns template and custom creation; a searchable,
  route-backed guide explains workflow terms and operating safeguards.
- Reversible workflow mutations expose one-click Undo, raw service failures are
  translated into actionable recovery copy, and documented keyboard shortcuts
  cover search, library navigation, and launch review.

## Validation

- Focused Vitest coverage for workflow sections, panels, schedule helpers, and
  responsive surface contracts.
- Focused Playwright fixture checks for the workflow library, all detail views,
  schedules, incoming webhooks, activity, dialogs, drawers, keyboard behavior,
  mobile geometry, dark theme, and automated accessibility.
- Re-run `npx impeccable --json` on the affected markup.
- Run `VITE_APP_DATA_MODE=control-plane npm run validate` before handoff.
- Re-run independent Impeccable critique and technical audit after browser
  verification; continue iterating until both requested score gates are proven.

## Boundaries

- Stay on `main`; do not commit or push.
- Do not change control-plane contracts or workflow execution semantics.
- Preserve URL-backed workflow selection, tabs, filters, drawers, and deep links.
- Preserve unrelated local files and the existing untracked audit report.
