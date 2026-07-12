# Account Menu Polish

## Goal

Turn the desktop account popover from a generic stack of rounded menu buttons into a compact operator identity panel with clearer hierarchy and a concise appearance action.

## Constraints

- Preserve account navigation, theme switching, logout behavior, keyboard dismissal, and focus restoration.
- Use existing design tokens in both themes; do not introduce hardcoded colors.
- Keep orange limited to selected or active state and keep logout visually destructive.
- Respect the existing sidebar width and reduced-motion expectations.

## UX Acceptance Criteria

- Identity is the visual anchor, with initials, name, and email readable at a glance.
- Redundant context labels are omitted; every visible word communicates identity, state, or action.
- Account settings reads as navigation, theme remains a compact labeled toggle, and logout is separated as a destructive action.
- The popover uses fewer nested pill-shaped surfaces and avoids repeating identical row treatments.
- The collapsed account trigger remains compact and clearly communicates open state.

## Validation Log

- `git diff --check`: passed.
- `npx vitest run src/app/AppDesktopSidebar.test.ts`: passed, 1 file and 15 tests.
- `npm run lint`: passed.
- `npm run validate`: passed, including 113 test files and 677 tests, membership, contract and harness checks, production build, and route smoke checks.
- Live Chrome capture at 1080 × 900: verified the open popover at the native 256px sidebar width in light and dark themes; the real theme control switched and persisted theme state correctly.

## Completion Criteria

- Completed. Focused coverage, the full validation entrypoint, and live browser inspection all pass.
