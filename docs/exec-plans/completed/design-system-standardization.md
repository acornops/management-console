# Management Console Design-System Standardization

## Goal

Standardize authenticated console surfaces around the operator's-ledger design language while preserving page-specific information architecture, route behavior, permissions, data density, and control-plane contracts.

## Constraints

- Login remains a distinct brand surface.
- Orange filled controls are limited to workflow launch or activation.
- No API, route URL, schema, permission, or backend behavior changes.
- Existing uncommitted work in the repository must be preserved.
- Embedded split-pane, chat, invitation, and recovery surfaces require documented exceptions.

## Migration status

- [x] Shared route, section, data-surface, toolbar, dialog, drawer, field, radio, switch, and menu primitives.
- [x] Semantic button intent renamed from `accent` to `activation`; routine actions migrated to neutral intents.
- [x] Native select, checkbox, and radio controls and custom switches migrated to shared controls.
- [x] Canonical spacing tokens added to CSS, Tailwind, and `DESIGN.md`.
- [x] Workspace overview and inventory route composition.
- [x] Agents, workflows, schedules, approvals, audit, settings, members, AI/MCP, user, and help composition.
- [x] Kubernetes and VM list/detail subview composition or documented embedded exception.
- [x] Development-only design-system catalog.
- [x] Design-system enforcement wired into local and CI validation.
- [x] Catalog snapshot baselines at desktop/mobile in light/dark themes.
- [x] Complete validation log below.

## UX acceptance criteria

- Create, Add, Invite, Save, and Continue use neutral primary styling.
- Workflow launch remains the only product activation button with orange fill.
- Authenticated routes share responsive margins, header rhythm, and control vocabulary.
- Shared overlays trap focus, close on Escape when allowed, expose explicit close controls, and restore focus.
- Every status remains understandable without color alone.
- Responsive layouts preserve page-specific task density without horizontal route overflow.

## Validation log

- `npm run design:snapshots:update`: passed, wrote four baselines for desktop/mobile and light/dark themes.
- `npm run validate`: passed. This included `design:check`, TypeScript, 694 Vitest tests in 114 files, four Playwright snapshots, membership checks, contracts, harness checks, production build, and route smoke tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed with the same full validation matrix in control-plane data mode.
- Production build retained the existing Rollup warning for chunks larger than 500 kB; the build completed successfully.

## Completion criteria

The plan is complete when design enforcement, TypeScript, tests, contracts, harness checks, production build, route smoke tests, and control-plane-mode validation pass; catalog snapshots exist for four theme/viewport combinations; documentation and residual exceptions are current.

Completed July 12, 2026. No public HTTP API, data schema, route URL, permission, or control-plane contract changed.
