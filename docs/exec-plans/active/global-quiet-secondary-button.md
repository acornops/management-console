# Global Quiet Secondary Button

## Goal

Replace the elevated filled secondary and icon-button treatments with a quiet,
accessible outline globally and shorten the Agent card action to Chat without
changing its route-backed behavior.

## Constraints

- Preserve primary, tertiary, activation, and danger variants.
- Use the dedicated quiet destructive-icon variant instead of local semantic
  border, text, and interaction classes.
- Preserve warning, authentication, and other semantic local color treatments.
- Keep `panel=chat` routing and existing internal quick-chat callback names.
- Preserve unrelated worktree changes.

## UX Acceptance Criteria

- Secondary and icon-only buttons are transparent and shadowless at rest.
- Destructive icon-only buttons stay neutral at rest and reveal danger semantics
  on hover and press; filled danger confirmations remain unchanged.
- The outline stays as faint as the theme's warm structural border in both themes.
- Text meets 4.5:1 contrast at rest and during interaction in both themes.
- Hover and press add a quiet warm-neutral fill; keyboard focus uses orange.
- Agent cards display Chat and expose Chat with the Agent name as their accessible label.
- The Agent dock heading uses Chat with the Agent name and its resize label says chat panel.

## Validation Log

- `npm run lint` passed.
- `npm run test` passed: 167 files and 797 tests.
- `npm run contracts:check` passed.
- `npm run smoke:routes` passed.
- `npm run ui:build` passed, and the aggregate `ui:check` completed successfully.
- Focused secondary and icon-button style tests passed for the transparent rest state,
  missing elevation, warm boundary token, tonal interaction states, orange focus,
  and 4.5:1 text contrast in both themes.
- Live browser verification of the Agent Chat maximize and close controls confirmed
  transparent rest backgrounds, `rgb(235 229 222)` boundaries, no shadow, and the
  warm `rgb(247 241 234)` hover fill.
- Live catalog verification of `dangerIcon` confirmed the same quiet rest state,
  `rgb(255 233 232)` danger-soft interaction fill, readable danger foreground,
  and no shadow while the filled danger confirmation remained unchanged.
- `npm run design:snapshots` passed after refreshing the catalog baselines: 23
  passed and the deterministic platform-specific case remained skipped.
- Focused design-route coverage passed for Login, Agents, Agent capabilities, and
  Audit Log in desktop light and dark themes. Manual browser inspection confirmed
  the Audit Log controls resolve to `rgb(235 229 222)` in light mode with a
  transparent background and no shadow; keyboard focus retains the orange ring.
- The Agents fixture passed all Chat terminology and responsive-panel scenarios.
  The complete file finished 13 of 14 tests; its unrelated base-detail navigation
  scenario timed out waiting for an `Agent Settings` control.
- `npm run harness:check` is blocked by the unrelated `src/App.tsx` line budget
  (602 lines against a 600-line limit).
- `npm run validate` completed `ui:check`, then stopped in `design:check` on three
  unrelated concurrent `src/styles.css` resource-card-grid contract violations.
- The full visual updater refreshed the affected baselines. Its relevant button
  routes passed; it also reported pre-existing Account Settings text-contrast
  findings and one transient VM navigation teardown outside this change.

## Completion Criteria

The shared component, semantic token, Tailwind preset, Agent terminology,
documentation, changeset, tests, and required repository validation all agree.
