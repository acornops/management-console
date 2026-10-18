# Management console production-readiness hardening

> Archive review — 2026-10-18: Implementation landed in 48ad022. The three-repeat browser policy was superseded by the CI optimization and current Operations policy. The exact original Node 22 clean-install/nginx gate is not evidenced here; later platform-release-hardening.md records validation on Node 24.2.0, not Node 22.
> Original scope, checklists, and validation below are historical; this is not a new runtime or rollout validation report.

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
