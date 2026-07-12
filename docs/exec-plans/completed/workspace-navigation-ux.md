# Workspace Navigation UX

## Goal

Deliver one production-ready, responsive, permission-aware workspace navigation
system for desktop and mobile, with stable deep links and an exact pending-
approval signal.

## Repository Role

The management console is the tolerant contract consumer. Normalize a valid
`pendingCount` from the approval inbox when available, hide the badge for older
or invalid producer responses, and share one navigation model across desktop
and mobile.

## Constraints

- Preserve all workflow, schedule, approval, and schedule-creation URLs.
- Keep the 256px desktop shell, Outfit typography, both themes, and existing tokens.
- Preserve workspace-data and audit-log permission checks.
- Use genuine base-path-aware links with standard modified-click behavior.
- Poll only while visible, refresh on focus and decisions, ignore stale responses,
  and retain the last successful count after transient failures.
- Use immediate active-state changes, 150–180ms color transitions, and a
  zero-duration reduced-motion fallback.
- Deploy after the additive control-plane contract.

## Validation Plan

- Targeted navigation, permissions, link semantics, accessibility, approval
  summary, polling, stale-response, decision-refresh, and route tests.
- `npm run lint`
- `npm run test`
- `npm run smoke:routes`
- `VITE_APP_DATA_MODE=control-plane npm run validate`
- Visual inspection at 320px, 768px, and 1440px in light and dark themes,
  including long names, restricted permissions, scroll overflow, Schedules,
  mobile drawer navigation, and 200% zoom.
- `node scripts/harness/check-platform-contracts.mjs` from the workspace root.

## Completion Criteria

- Desktop and mobile consume one navigation hierarchy with accessible landmarks,
  correct active states, permitted groups, and a separately pinned account control.
- Workflows and Schedules share route-level navigation and sidebar destination state.
- Badge values hide at zero or unavailable, render 1–99 exactly, and cap at `99+`
  without layout shift.
- Durable console navigation guidance and validation evidence are recorded.

## Validation Log

- `npm run lint`, `npm run test` (667 tests), `npm run contracts:check`,
  `npm run harness:check`, `npm run smoke:routes`, and
  `VITE_APP_DATA_MODE=control-plane npm run validate` passed.
- Expanded route smoke coverage includes Overview, Workflows, Schedules,
  schedule creation, and Approvals deep links.
- Workspace platform-contract and validation entrypoints passed.
- Visual inspection covered 1440px and 768px light-theme layouts plus the dark
  mobile drawer at a true 320 CSS-pixel viewport. The drawer reported no
  horizontal overflow, long workspace names clamped, `99+` remained stable,
  and the zero-count badge was omitted.
