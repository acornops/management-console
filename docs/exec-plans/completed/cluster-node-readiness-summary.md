# Cluster Node Readiness Summary

## Goal

Show an authoritative ready-node ratio on the cluster overview without fetching or exposing a full snapshot payload.

## Constraints

- Extend the existing control-plane cluster summary additively.
- Preserve `Unknown` only when node inventory is genuinely absent.
- Keep summary payloads bounded and avoid an overview-specific inventory request.

## Outcome

- New snapshot summaries persist `readyNodeCount` beside `nodeCount`.
- Legacy summaries derive readiness from the normalized Node inventory only when its count matches the summary total.
- The console prefers the bounded summary and retains its raw-node fallback for fixture and legacy payloads.

## Validation

- Control-plane targeted snapshot, controller, and repository tests passed.
- Control-plane typecheck, contract check, OpenAPI check, and build passed.
- Console targeted mapper, overview, and fixture tests passed.
- Console UI build, application typecheck, contract check, and production build passed.

## Completion Criteria

- Completed with additive, backward-compatible control-plane and console changes.
