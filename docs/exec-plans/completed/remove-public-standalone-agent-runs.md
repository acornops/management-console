# Remove Public Standalone Agent Runs

## Goal

Remove the console controls and API client surface for standalone Agent runs.

## UX Acceptance Criteria

- Agent profiles no longer expose an Activity tab or Run Agent action.
- Legacy `panel=activity` and `agentTab=activity` links fall back to the Agent
  overview instead of rendering a removed surface.
- Agent definition management, capability configuration, restore points, and
  Workflow assignment remain unchanged.
- Frontend API types and tests no longer expose Agent activity or trigger
  endpoints.

## Validation

- `npm run lint` passed.
- `npm run test` passed with 611 tests.
- The two affected Agent-profile fixture files passed 24 browser tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate` passed using the installed
  Playwright headless browser: 611 unit tests, 19 design-system browser tests
  with one existing skip, 129 fixture smoke tests, 21 MCP-parity tests,
  membership/contract/harness checks, the production build, and route smoke.
- `git diff --check` passed.

## Compatibility

Legacy `panel=activity` and `agentTab=activity` URLs normalize to the Agent
profile overview so saved links do not land on an invalid tab.

## Completion Criteria

The console contains no standalone Agent launch or activity controls and all
control-plane-mode validation passes.
