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

Complete. Lint, all 801 tests, contract and harness checks, route smoke, the
focused progressive-disclosure browser test, and the production build pass. The
catalog request is invalidated on modal close or workspace switch to prevent
stale checklist data.
