# Management Console Reliability

## Failure Modes

- Control-plane API drift breaks data mapping or route flows.
- SSE disconnects or replay gaps leave collaborative chat or trace views inconsistent.
- Auth redirect or base-path regressions break operator access.
- Unbounded list or snapshot payloads degrade page responsiveness or rendering.

## Required Validation

- Run `npm run validate` for every substantive change.
- Validate in control-plane mode when changing real API integrations.
- Preserve route stability for workspace and cluster deep links.
- Keep v1 console payloads bounded: lists use `{ items, nextCursor? }`, large routes lazy-load pages, and cluster detail exposes summary counts instead of full snapshot JSON.
- Preserve run trace handling for replay, SSE, and terminal states.
- Preserve target chat activity replay for collaborative message discovery, approval checkpoints, and final assistant commits.

## Recovery Expectations

- Prefer additive UI mapping for evolving payloads.
- Show explicit degraded states instead of hiding failures.
- Capture new UI invariants in docs or structural checks when they become durable.
