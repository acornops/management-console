# Dark Theme And System Preference

## Goal

Align the management console dark theme with the warm neutral palette used by the AcornOps documentation site, correct filled-control foreground contrast, and replace the binary theme toggle with one accessible System, Light, and Dark preference menu shared by login and authenticated navigation.

## Constraints

- Limit product changes to `management-console`; the documentation site is a visual reference only.
- Preserve existing stored Light and Dark choices, profile-over-global precedence, route behavior, authentication behavior, and control-plane contracts.
- Persist System explicitly and use it for missing or invalid preferences.
- Preserve the restrained neutral button hierarchy; orange fills remain limited to activation, with danger retaining its semantic fill.
- Keep user-triggered theme reveal motion when the resolved appearance changes. System-driven changes do not use click-origin motion and all paths respect reduced motion.
- Use canonical OKLCH tokens with matching RGB mirrors and meet WCAG 2.1 AA text and interactive-boundary contrast targets.

## UX Acceptance Criteria

- Dark canvas, surface, strong surface, border, text, and muted text match the docs-derived warm palette.
- Filled primary, secondary, activation, and danger controls use semantic foreground tokens that remain readable in both themes.
- Login, desktop account navigation, and mobile navigation use the same theme menu and expose Monitor, Sun, and Moon choices.
- The menu uses `menuitemradio` semantics, reports checked state, supports Arrow, Home, End, Escape, outside-click dismissal, and restores focus to its trigger.
- Missing or invalid stored preferences resolve through System; valid legacy Light and Dark preferences remain unchanged; profile preferences override global preferences.
- System follows `prefers-color-scheme`, reacts to live operating-system changes only while selected, applies before first paint, and keeps browser `theme-color` synchronized with the resolved canvas.
- A user selection that changes the resolved appearance uses the existing theme reveal. Choosing System without changing appearance only updates the preference, and later operating-system changes are immediate.

## Implementation Notes

- Add explicit `ThemePreference` and `ResolvedTheme` types plus pure parsing and resolution helpers.
- Keep existing rendering consumers on the resolved `isDark` interface while threading the preference and setter to the shared menu.
- Extend the shared Tailwind token vocabulary for control fills, foregrounds, and interactive boundaries, then migrate custom filled-button classes from generic `text-ui-bg` where they represent controls.
- Update English and Chinese theme copy, the design-system standard, and focused motion documentation.

## Validation Log

- Passed targeted preference, theme transition, menu, navigation, style, application-motion, and split surface-contract tests. The final repository unit run passed 121 files and 748 tests.
- Passed `npm run design:snapshots`: 14 browser tests covering desktop and mobile catalogs, responsive target sizing, System first paint in both OS schemes, menu keyboard/radio behavior, persistence, focus restoration, and live OS changes without a click-origin reveal.
- Refreshed all four desktop/mobile Light/Dark catalog baselines with `npm run design:snapshots:update`.
- Visually inspected login and authenticated navigation at desktop and mobile widths in Light, Dark, and System-resolved Dark. The mobile login menu was adjusted to a compact bottom row so it does not obscure the logo or heading.
- Passed `CI=1 TMPDIR=/dev/shm npm run validate`: design-system policy across 253 source files, TypeScript, 121 unit-test files/748 tests, 14 Playwright checks, workspace membership, contracts, harness budgets, production build, and route smoke checks.
- No checks were skipped. The temporary-directory override was required because the root filesystem had about 47 MB free; browser profiles in `/dev/shm` avoided unrelated Chromium crashes. The production build retained its existing large-chunk advisory.
- Documentation impact: updated the product design standard, design-system standardization guide, and motion guide. Contract impact: none; no server API, schema, or persistence-backend changes.

## Completion Criteria

- Implementation, documentation, focused tests, snapshots, browser inspection, and the repository validation gate pass.
- Exact results and any skipped checks are recorded here before this plan moves to `docs/exec-plans/completed/`.
