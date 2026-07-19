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
- Preserve target chat activity resume replay for collaborative message discovery, approval checkpoints, and final assistant commits; fresh streams rely on recent activity/session reads for initial state.

## Recovery Expectations

- Prefer additive UI mapping for evolving payloads.
- Show explicit degraded states instead of hiding failures.
- Capture new UI invariants in docs or structural checks when they become durable.
- Session bootstrap distinguishes an initial unauthenticated `401` from network
  and control-plane `5xx` failures. The former opens sign-in; the latter keeps a
  retryable unavailable screen so an outage never looks like logout.
- After authentication, the first `401` expires the client session once, clears
  user/workspace/target/cluster/VM and CSRF state, unmounts active streams, and
  preserves the current deep link for sign-in recovery.
- SSE `401` and `403` responses stop immediately. Network and `5xx` failures use
  capped backoff with at most five reconnect attempts; logout and session expiry
  unmount stream owners and prevent further retries.
- Root and global browser error handlers emit deduplicated, sanitized incident
  records. Records may contain HTTP status and control-plane request IDs, but
  never raw errors, stacks, tokens, bodies, or URL query parameters.
