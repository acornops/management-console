# MCP PAT UI and backend parity

## Status

Completed on 2026-07-16.

## Goal

Make every MCP-authenticated run failure recoverable from the management
console while keeping credential submission explicit and installation state
truthful.

## Boundaries

- Parse structured readiness details at the control-plane client boundary and
  remain compatible with legacy string-only errors.
- Put only installation IDs and recovery actions in URLs. Never put a PAT or
  connection snapshot in navigation or durable browser state.
- Focus and highlight recovery controls without automatically connecting or
  verifying.
- A successful personal connection remains successful if the subsequent tool
  refresh fails; report the stale catalog as a separate retryable load error.
- Resume of an MCP-auto-paused schedule remains an explicit user action.

## Implementation

- Add shared readiness routing and MCP error formatting utilities.
- Add target and Agent recovery focus, catalog refresh, loading, disconnect,
  authenticated-install sequencing, and rate-limit countdown behavior.
- Surface schedule `lastStatus` and `lastError` with an Agent installation
  recovery path.
- Update the contract manifest and durable operator documentation.
- Add unit and control-plane-mode browser coverage for the recovery paths.

## Validation

- Focused unit and browser tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`.
- Workspace contract and runtime-truth checks.

## Outcomes

- Target chat, Agent runs, workflow launches, and workflow follow-ups now share
  exact-installation recovery routing with focus but no automatic mutation.
- Authenticated installations, catalog refreshes, disconnected/loading states,
  rate-limit countdowns, and schedule auto-pause recovery all use truthful,
  retryable presentation.
- The control-plane-mode browser fixture covers creation, discovery, reconnect,
  recovery focus, throttling, and schedule repair without retaining credentials.

## Evidence

- `VITE_APP_DATA_MODE=control-plane npm run validate` passed: 786 unit tests,
  19 visual tests (1 intentionally skipped), the standalone fixture smoke,
  3 MCP parity browser tests, contracts, harness, production build, and route
  smoke checks.
- Workspace `task runtime-truth:check` and `task validate` passed.
- Docs validation and broken-link checks passed under Node 22.
