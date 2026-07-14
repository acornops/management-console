# Management Console Design Compliance Remediation

## Goal

Align the management console with `DESIGN.md` while keeping the login illustration continuously live, preserving the flat no-glass operational treatment, and repairing undersized or page-local controls across the production console.

## Constraints

- Preserve route URLs, URL-backed tab state, permissions, control-plane APIs, data models, and backend contracts.
- Keep theme changes on the live DOM; do not use a page snapshot or pause the login illustration.
- Use semantic design tokens in both themes and reserve orange for activation, focus, and selected state.
- Retain motion only where it communicates state or interaction continuity.
- Preserve concurrent System, Light, and Dark preference work and all existing user changes.

## UX Acceptance Criteria

- Theme selection uses one non-occluding 320 ms click-origin ripple and a shared 160 ms destination-icon swap; reduced motion is immediate and rapid changes clean up the previous ripple.
- Route headers, page content, tables, and Kubernetes tab panels render immediately without generic fades.
- Code and log surfaces use the shared high-contrast `code-text` token in both themes.
- Production source contains no standard named Tailwind palette classes and no `backdrop-blur` treatment.
- Agent profile tabs provide stable tab/panel relationships, roving focus, Arrow/Home/End navigation, and preserve URL-backed `agentTab` state.
- Approval and audit filters use the shared filter vocabulary with programmatic pressed state and translated group labels.
- Interactive targets are at least 44 px below `sm` and at least 36 px from `sm` upward, except for the documented 40 px desktop-sidebar navigation row.
- Dialog, drawer, navigation, menu, chat, target-administration, workflow, file-tree, toast, list, and authentication controls use the shared control vocabulary or the canonical responsive target helper.

## Implementation Summary

- Added `ThemeToggleIcon`, `code-text`, and `control-target` interfaces and documented their intended use.
- Replaced decorative route, header, table, and tab-content fades with immediate rendering while retaining dialogs, drawers, loading/status feedback, the active-tab indicator, sidebar feedback, and theme switching.
- Migrated named palette colors to code, semantic status, or neutral UI tokens and replaced chat blur with opaque token scrims.
- Migrated agent tabs to `SegmentedTabs`, approval and audit presets to `FilterToggleGroup`, menu commands to `MenuItem`, overlay and navigation closes to `CloseButton`, and icon actions to shared `Button` sizing.
- Strengthened `design:check` to reject the complete standard Tailwind palette set, `backdrop-blur`, and raw buttons without a tested sizing helper or canonical responsive target.
- Expanded the development catalog with theme-toggle, code-surface, tabs, filters, and compact-control examples.

## Validation Log

- `npm run design:check`: passed across 253 production source files.
- Targeted Vitest coverage passed for theme transition cleanup and reduced motion, destination icons, immediate route/tab rendering, agent-tab ARIA and keyboard contracts, approval filters, code contrast, shared primitives, and chat scrims.
- `npm run design:snapshots:update`: regenerated desktop/mobile Light/Dark catalog baselines.
- Visually inspected all four regenerated catalog images; no clipping, hierarchy regression, glass treatment, or undersized catalog target was found.
- `npm run validate`: passed without modifying the repository's Playwright configuration. This included TypeScript, 121 Vitest files and 748 tests, 14 Playwright checks, workspace membership, contracts, harness checks, production build, and route smoke checks.
- No checks were skipped. The production build retained its existing large-chunk advisory.
- No API, schema, authorization, persistence, route, or backend contract changed.

## Completion Criteria

Implementation, documentation, enforcement, targeted tests, responsive browser checks, four reviewed visual baselines, and the complete repository validation gate all pass.

Completed July 14, 2026.
