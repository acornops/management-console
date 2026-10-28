# Management Console Reliability

## Failure Modes

- Control-plane API drift breaks data mapping or route flows.
- SSE disconnects or replay gaps leave collaborative chat or trace views inconsistent.
- Auth redirect or base-path regressions break operator access.
- Unbounded list or snapshot payloads degrade page responsiveness or rendering.

## Required Validation

- Run `npm run validate` for every substantive change.
- Do not run `npm run validate:full` by default for routine UI work. Reserve it
  for PR/release readiness, broad or high-risk behavior, browser-harness
  changes, large visual-baseline updates, or an explicit user request.
- During iteration, prefer the smallest affected Vitest or Playwright command.
- Validate in control-plane mode when changing real API integrations.
- Preserve route stability for workspace and cluster deep links.
- Workspace Settings selection is controlled by the route, not an optimistic
  local tab copy. Back/Forward, including Back before a tab transition commits,
  must restore the selected link and displayed page together. Permission checks
  still prevent unavailable settings from rendering.
- Keep v1 console payloads bounded: lists use `{ items, nextCursor? }`, large routes lazy-load pages, and cluster detail exposes summary counts instead of full snapshot JSON.
- Preserve run trace handling for replay, SSE, and terminal states.
- Preserve target chat activity resume replay for collaborative message discovery, approval checkpoints, and final assistant commits; fresh streams rely on recent activity/session reads for initial state.

## Recovery Expectations

- Prefer additive UI mapping for evolving payloads.
- Show explicit degraded states instead of hiding failures.
- Explicit workflow URLs retain their requested identity when unavailable; they
  never expose another workflow's Edit/Launch actions while resolving or after
  failure. Legacy name and ID links remain supported, with deliberate library
  navigation as recovery.
- External integrations distinguish initial loading, successful empty results,
  and load errors. Failed refreshes retain prior rows and local grant drafts with
  stale feedback. Shared toast feedback defaults to neutral information; callers
  classify completed successes and failures explicitly.
- An open shared Select consumes Escape when it closes its own menu, leaving
  the parent dialog's close or draft-discard policy for a subsequent Escape.
- Assistant capability previews keep the tools/skills list capped at `14rem`
  with keyboard-accessible internal scrolling. More tools must not turn the
  popup into a nearly full-height panel. Keep the outer viewport/dialog height
  limit as a short-screen fallback and preserve portal placement and Escape
  focus restoration. Test compact desktop height as well as mobile containment.
- Route-level control-plane reads use session-scoped, in-memory data continuity:
  a previously loaded snapshot remains visible across route unmounts while the
  route revalidates in the background. Only a first visit without a usable
  snapshot presents an initial loading surface. Cache keys include the
  workspace, resource identity, and active filters or detail identity.
- Cached control-plane payloads are bounded and never persisted to browser
  storage. They are cleared whenever the authenticated user changes or signs
  out. Cached permissions improve continuity only; the control plane remains
  authoritative for every operation.
- Capture new UI invariants in docs or structural checks when they become durable.
- Session bootstrap distinguishes an initial unauthenticated `401` from network
  and control-plane `5xx` failures. The former opens sign-in; the latter keeps a
  retryable unavailable screen so an outage never looks like logout.
- After authentication, the first `401` expires the client session once, clears
  user/workspace/target/cluster/VM and CSRF state, unmounts active streams, and
  preserves the current deep link for sign-in recovery.
- SSE `401` and `403` responses stop immediately. General streams use capped
  backoff with at most five reconnect attempts. An active run keeps reconnecting
  with capped backoff while its observer remains mounted; logout and session
  expiry unmount stream owners and prevent further retries.
- Run status polling tolerates transient network and `5xx` failures within its
  observation deadline. A monitoring timeout does not establish run failure:
  an accepted turn stays pending and transfers to the active-run watcher for
  reconciliation with durable server state.
- A terminal event retains its truthful status while final-message hydration is
  pending. Initial status reads and final hydration retry transient failures
  until the observer is disposed; permanent errors stop observation. Reconciliation
  preserves the existing assistant message identity.
- JSON requests retry at most three times only after an explicit HTTP 503
  `SERVICE_DRAINING` response with `retryable: true` and `outcome: not_started`.
  Retries preserve the original body, including message identity and approval
  decision. Network errors, ambiguous write outcomes and redirects do not grant
  permission to replay a mutation; aborting prevents the next attempt.
- Root and global browser error handlers emit deduplicated, sanitized incident
  records. Records may contain HTTP status and control-plane request IDs, but
  never raw errors, stacks, tokens, bodies, or URL query parameters.
