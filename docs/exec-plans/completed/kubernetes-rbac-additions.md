# Kubernetes RBAC Additions

## Goal

Let users select administrator-approved Kubernetes integrations while connecting
a cluster, without exposing API groups, resources, or verbs.

## Boundaries

- Load summaries from the control plane after the workspace is selected.
- Render an explicit empty state when no additions are configured.
- Submit only selected stable keys with cluster registration.
- Keep existing cluster install/regeneration behavior snapshot-backed and read-only.

## Validation

- Cover empty, loading, failure, selected, and submission states.
- Run lint, tests, control-plane-mode route smoke, contracts, harness, and validate.

## Result

The console request is invalidated on modal close or workspace switch. It shows
the effective administrator-authored catalog, submits only selected stable keys,
and preserves the explicit empty state when no additions are configured. The
control plane resolves those keys into an immutable per-cluster snapshot, and
AgentK constrains custom-resource operations to that snapshot.
