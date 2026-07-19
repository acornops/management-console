# Management console production-readiness hardening

## Goal

Close release blockers around reproducible source, fail-safe authorization and
session behavior, browser crash recovery, and deterministic browser validation.

## Constraints

- Limit changes to `management-console`.
- Keep the repository-root `PLAN.md` untouched and untracked.
- Do not add OpenTelemetry or another centralized browser telemetry provider.
- Preserve server-side authorization as the enforcement boundary.

## Completion criteria

- Explicit server permission booleans take precedence over role capabilities.
- Authentication configuration and session bootstrap fail closed with retryable
  unavailable states.
- Authenticated 401 responses coalesce into one complete session-expiry reset.
- SSE authorization failures stop while transient failures use bounded retries.
- Browser crashes render a safe recovery screen and emit sanitized incident IDs.
- Fixture and MCP parity suites pass three repetitions with retries disabled.
- Required source and tests are tracked, excluding generated output and `PLAN.md`.

## Validation log

Record exact Node 22 release-gate results in the final handoff.
