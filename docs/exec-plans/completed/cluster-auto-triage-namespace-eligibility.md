# Cluster Auto-Triage Namespace Eligibility

## Goal

Expose the control plane's Kubernetes-only automatic-investigation namespace
eligibility policy in the existing target Settings surface.

## Scope

- Reuse the existing restrained target settings form composition.
- Show namespace include and exclude inputs only for Kubernetes targets.
- Make empty lists mean all observed namespaces.
- Let administrators explicitly include or exclude cluster-scoped issues.
- Keep virtual-machine settings and behavior unchanged.
- Keep the control-plane API as the source of truth.

## Validation

- Add focused draft, API serialization, and rendering regressions.
- Run lint, tests, contracts, harness, route smoke, and validation gates.

## Status

Completed. The Kubernetes-only controls use the existing target settings
composition and serialize the control-plane contract without changing the VM
surface. Namespace inputs validate names and the API limit before save, expose
associated accessible errors, and preserve the operator's draft through
revision conflicts.
