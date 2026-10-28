# Preserve active conversations during rolling restarts

Part of the [coordinated implementation plan](../../../../acornops-deployment/docs/exec-plans/active/2026-10-29-graceful-rolling-restarts.md).

## Scope

Preserve accepted run identity and pending assistant state across transient control-plane failures. Retry only explicit pre-admission drain responses for mutations; never retry an uncertain write. Keep authorization failures terminal for the observer. Preserve existing run policy and event deduplication.

## Tasks

- [x] Add failing tests for terminal polling recovery, authorization rejection, bounded monitoring and active-run reconnect behavior.
- [x] Implement focused polling/backoff and keep active-run observation alive after repeated stream disconnects.
- [x] Preserve accepted pending runs when observation times out or encounters a transient failure; immediately handle stream promise rejection.
- [x] Add tests and bounded retries for explicit `503 SERVICE_DRAINING`, preserving request body/identity and cancellation; reject ambiguous errors.
- [x] Run targeted tests, full canonical validation in control-plane mode, and independent review.

## Evidence

Baseline targeted API/retry/submission tests: 35 passed. No visual layout changes are planned.

Targeted verification: API, HTTP, retry, submit, watcher lifecycle and derived-state
tests passed. New recovery cases were first observed failing against the old
implementation. Independent review found and verified fixes for redirected
workspace mutation replay, initial status-read retry and post-terminal message
hydration. All findings are addressed.

`VITE_APP_DATA_MODE=control-plane npm run validate` passed: 234 test files,
1226 tests, typecheck, design checks, membership/contracts/harness, production
build, bundle budget and route smoke. Review fixes preserve truthful terminal
status, stable message identity and observer disposal. Cross-service rollout
evidence remains tracked in the coordinated plan.

Concurrent unrelated Agent capability and approval UI edits appeared during this work. They are outside this plan and must not be staged with it.
