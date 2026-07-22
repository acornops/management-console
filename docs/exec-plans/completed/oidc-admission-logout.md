# OIDC admission and logout console integration

## Goal

Consume the versioned auth/logout contract, perform full-page OIDC logout navigation, and render only bounded admission/logout notices.

## Validation

- Full Vitest suite passes: 107 files and 584 tests.
- Typecheck, design-system, contract, harness, production build, and route smoke checks pass.
- The final review reran unit tests, typecheck, contracts, harness, and production build; browser-backed smoke reruns were unavailable in the restricted environment.

## Completion criteria

- OIDC enablement comes from runtime configuration.
- Logout never exposes a provider URL or token to application code.
- Known result codes render generic notices and are removed from browser history state.
