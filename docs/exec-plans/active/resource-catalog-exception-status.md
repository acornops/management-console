# Resource Catalog Exception-Only Status

## Goal

Remove routine positive status pills from resource catalog cards so card titles
and primary actions retain stable space, while keeping states that require
operator attention explicit.

## Scope

- Agent cards omit `Ready` and retain `Needs setup` or `Blocked`.
- Kubernetes cluster cards omit `Healthy` and retain setup, warning, finding,
  disconnected, and error states.
- Virtual machine cards omit `Healthy` and retain setup, degraded, offline,
  finding, warning, and critical states.
- Counted warning and finding pills keep their numeric value and use the correct
  singular or plural label.
- Status-rich tables, execution history, configuration panels, and detail views
  remain unchanged because status is primary data in those contexts.

## Validation

- Add focused unit coverage for the shared exception-only visibility rule.
- Run the affected unit test and typecheck.
- Run the repository validation entrypoint and record exact outcomes.

## Completion Criteria

- Normal resource catalog cards render without positive status pills.
- Every non-success catalog state continues to render its existing semantic
  label, tone, and accessible reason.
- Narrow card headers no longer wrap because of a routine positive pill.
