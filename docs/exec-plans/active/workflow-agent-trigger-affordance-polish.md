# Workflow, Agent, and trigger affordance polish

## Goal

Make workflow and Agent editing immediately understandable, then align trigger
ledgers with the console's established information density and overflow-action
patterns.

## UX boundaries

- Keep Agent editing as the primary action in the Agent detail header.
- Add a direct workflow edit entry point without competing with Schedule,
  Activate, or Launch.
- Use the shared fishball overflow menu for secondary row actions in every
  desktop trigger ledger.
- Keep urgent recovery actions visible when hiding them would make a failed
  trigger harder to repair.
- Add only operationally useful columns: workflow, trigger configuration,
  destination, event coverage, activity, and modification time.
- Preserve compact mobile layouts, keyboard navigation, focus restoration,
  localization, confirmation dialogs, and URL-backed filters.

## Validation

- Focused fixture-browser coverage passed for workflow and Agent edit
  affordances, compact automation layouts, trigger columns, overflow menus,
  keyboard focus restoration, and destructive confirmations.
- `npm run lint` — passed.
- `npm run test` — 128 files and 675 tests passed.
- `npm run design:check` — passed across 372 source files.
- `npm run design:snapshots` — 19 passed and 1 intentionally skipped across
  desktop and mobile projects.
- `npm run smoke:fixtures` — 162 repeated fixture-browser checks passed.
- `npm run smoke:mcp-parity` — 21 repeated parity checks passed.
- `npm run membership:check` — passed.
- `npm run contracts:check` — passed.
- `npm run harness:check` — passed.
- `npm run build` — passed.
- `npm run smoke:routes` — passed.
- Control-plane `npm run validate` — passed, including 964 tests, authorization,
  membership, run-event durability, contracts, public and admin OpenAPI,
  harness, and build checks.
- Browser checks passed at 390 px and 1440 px for trigger tabs and menus, empty
  cluster onboarding, workflow and Agent editing, and AI-provider onboarding.
  The checked layouts had no horizontal overflow.
- Playwright configs use the managed Chromium default on every platform while
  retaining `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for deployments that require
  an explicit browser binary.
- `git diff --check` — passed.
