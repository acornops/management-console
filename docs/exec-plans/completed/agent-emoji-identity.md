# Agent Emoji Identity

Status: Complete

## Goal

Let workspace managers choose an Agent emoji during creation, edit it later,
and recognize the same identity across Agent catalog and detail surfaces.

## Constraints

- Reuse the existing neutral Agent avatar tile.
- Keep the emoji decorative; readiness and status remain explicit text.
- Start with a curated set and allow one pasted or keyboard-entered emoji.
- Preserve all in-progress Agent chat and navigation work in the current
  worktree.
- Consume the additive control-plane `avatarEmoji` field with a local fallback.

## UX Acceptance Criteria

- Create suggests an emoji from the Agent name without making it required work.
- Selecting an emoji is keyboard accessible and exposes pressed state.
- Edit shows and updates the current emoji.
- The review step includes the selected identity.
- Catalog cards, Agent settings, full Chat, and Quick chat identify the Agent
  with the chosen emoji.

## Validation Log

- `npm run lint` passed.
- `npm run test` passed: 137 files and 711 tests.
- Focused Agent emoji unit coverage passed: 2 files and 5 tests.
- `npm run contracts:check` passed.
- `npm run design:check` passed.
- `npm run build` passed.
- The focused creation and catalog browser coverage passed in both selected
  scenarios.
- Focused full Chat and Quick chat browser coverage confirms the persisted
  emoji appears in both rendered headers.
- The shared chat header and Agent identity unit coverage passed: 3 files and
  9 tests. The management-console TypeScript no-emit check passed.
- The `workspace-agents` visual contract passed in desktop and mobile,
  light and dark, including WCAG 2.1 AA and 200 percent text reflow checks:
  9 passed and 3 intentionally skipped.
- `npm run harness:check` remains blocked by pre-existing file-size overruns in
  `App.tsx`, `AppDesktopSidebar.tsx`, `McpServersView.tsx`,
  `TargetToolsView.tsx`, and `styles.test.ts`; this change did not grow those
  files.

## Completion Criteria

- API mapping, fixtures, creation, editing, and core identity surfaces use the
  same value.
- Unit and browser-level checks cover fallback, selection, persistence, and
  accessible labeling.
- Contract manifests match the producer.
