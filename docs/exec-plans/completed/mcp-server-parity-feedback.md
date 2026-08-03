# MCP server parity and feedback

## Goal

Preserve the shared Target and Agent MCP inventory while fixing Agent contract
mapping defects and making server actions report their outcome.

## Constraints

- Preserve existing routes, response envelopes, and Target behavior.
- Reuse the current MCP inventory and notice components.
- Do not add database or gateway schema changes.

## Outcome

- Preserved Agent OAuth, public headers, auth header configuration, and
  discovery fields through the console API boundary.
- Consumed the real Agent connection-test result.
- Added shared success and failure feedback for health and credential actions.
- Added focused adapter, fixture, and browser parity coverage.

## Validation

- `env VITE_APP_DATA_MODE=control-plane npm run validate`
- `npm run smoke:mcp-parity -- --grep 'Agent credential refresh|Agent OAuth creation'`
- Workspace platform-contract check.
