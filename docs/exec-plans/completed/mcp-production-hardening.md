# MCP Production Hardening

## Goal

Make the shared Agent and target MCP administration flow truthful and safe
across OAuth completion, server changes, inherited workspace starters,
permission boundaries, disconnected targets, and paged tool discovery.

## Constraints

- Preserve the existing Add MCP server, credential, review, inventory, and
  tools-dialog patterns.
- Consume the checked-in control-plane contracts without changing producer or
  gateway code.
- Never render or mutate tools from one MCP server under another server.
- Keep revocation-only Agent permissions separate from full MCP management and
  keep Target Insights permission independent from MCP management.
- Preserve workspace-starter provenance until the server is materialized.
- Keep fixtures representative of cursor pagination and inherited entries.

## Work

- [x] Complete correlated original-window OAuth lifecycle and workflow/schedule readiness refresh.
- [x] Scope cursor collection state to the active server and clear refresh state.
- [x] Load every tool page before create review and show authoritative totals.
- [x] Preserve target inherited provenance and disconnected-agent status.
- [x] Separate MCP and Target Insights permissions.
- [x] Mirror endpoint, auth-header, and public-header collision validation in the form.
- [x] Preserve producer-required capability approval payloads for discovered tools.
- [x] Add realistic fixtures and focused regression tests.
- [x] Run targeted and repository validation.

## Validation

- `npm run app:typecheck && npm run harness:check && npx vitest run ...` passed
  with 13 focused files and 88 tests covering correlated OAuth handoff and
  workflow refresh, cursor identity, create review, approval payloads,
  permissions, endpoint/header validation, mappings, and fixtures.
- `env VITE_APP_DATA_MODE=control-plane npm run validate` passed with 211 test
  files and 1,070 tests, contract and harness checks, production build, bundle
  budget, and route smoke checks.
- The final workflow/schedule OAuth delta passed `npm run app:typecheck`,
  `npm run harness:check`, `git diff --check`, and 4 focused files with 30 tests.

## Completion

OAuth completion returns the original UI to a usable state, newly created OAuth
servers enter complete tool review, tool rows cannot cross server boundaries,
workspace starters remain immutable until enabled, status and permissions are
truthful, direct registration rejects known producer-invalid inputs inline, and
cursor-backed behavior is covered by realistic fixtures and regression tests.
