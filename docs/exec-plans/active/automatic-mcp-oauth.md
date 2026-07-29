# Automatic MCP OAuth

## Goal

Provide the paste-URL, select-OAuth, review-discovered-issuer/scopes, browser
login, and connected MCP experience for Agent and target installations.

## Decisions

- OAuth never displays or requests a client ID or client secret.
- OAuth is individual-only; workspace credential controls are hidden.
- The UI shows only authorization-server origin, registration method, scopes,
  and refresh/offline-access disclosure.
- Fixture mode reports external OAuth as unavailable.

## Work

- [x] Extend API and MCP connection types with OAuth states/actions.
- [x] Add OAuth preparation/authorization dialog and return-result handling.
- [x] Add OAuth to Agent and target installation forms.
- [x] Update connection cards, recovery actions, copy, contracts, and tests.
- [x] Treat remote endpoint paths as opaque and align creation copy with the
  authorization-before-discovery flow.

## Validation

- Typecheck and 748 tests: passed.
- Design-system checks and 19 browser snapshots: passed (1 intentionally skipped).
- MCP parity: 21 passed.
- Membership, contracts, harness, production build, and route smoke: passed.
- The fixture suite reported two unrelated timing flakes under concurrent
  validation; both passed on immediate isolated rerun.

## Cross-repository dependency

Consumes the control-plane API. Merge after llm-gateway and control-plane.
