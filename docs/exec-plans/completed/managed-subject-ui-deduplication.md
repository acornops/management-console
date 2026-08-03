# Managed subject UI deduplication

## Goal

Remove repeated navigation, capability administration, conversation wiring,
issue-ledger, capability-inventory, and agent-install UI across Kubernetes
clusters, virtual machines, and Agents without treating Agents as runtime
targets or weakening route compatibility.

## Boundaries

- Shared UI uses target-neutral managed-subject and capability-owner language.
- Kubernetes and VM runtime behavior remains behind explicit target adapters.
- Agent APIs remain behind Agent capability and conversation adapters.
- Existing cluster, VM, and Agent URLs remain valid and shareable.
- Cluster-only health/resources and VM-only resource categories remain explicit.
- No control-plane API or cross-repository contract changes are in scope.

## Work

1. Replace repeated desktop and mobile subject-navigation branches with one
   capability-driven navigation model and two shared renderers.
2. Consolidate subview parsing and path-segment conversion while preserving
   subject-specific allowed views.
3. Add a shared capability administration host with explicit target and Agent
   adapter inputs.
4. Add one controlled conversation adapter for the shared conversation view.
5. Extract the shared Kubernetes/VM issue ledger, capability inventory shell,
   and agent-install instruction step.
6. Add focused tests for adapters and shared renderers, then run repository
   validation.

## Acceptance criteria

- Desktop and mobile navigation render the same destinations, labels, badges,
  active states, links, and assistant status as before.
- Unsupported subject capabilities are absent by construction.
- Agents remain capability owners, not `TargetDescriptor` instances.
- Kubernetes and VM issue rows preserve their target-specific source labels.
- Capability inventories retain their existing table anatomy and filtering.
- Cluster and VM installation flows retain commands, copy feedback, connection
  state, warnings, and completion behavior.
- `npm run validate` passes, or every residual failure is recorded exactly.

## Validation

- Targeted Vitest coverage for route codecs, subject navigation, capability
  adapters, and shared presentation helpers.
- `npm run lint`
- `npm run build`
- `npm run validate`

## Outcome

- Shared managed-subject navigation now drives desktop and mobile Agent,
  Kubernetes, and VM destinations from one adapter model.
- Capability routing, conversation controller presentation, issue ledgers,
  capability inventory chrome, and install instructions use shared components.
- Agent capability subjects remain explicitly distinct from runtime target
  descriptors.
- Focused validation passed with 40 tests across 8 files.
- Full repository validation passed with 1,001 tests across 206 files, contract
  checks, design-system checks, production build, bundle budget, and route smoke
  checks.
- Browser validation covered the complete 127-test fixture inventory, the
  eight-test MCP parity suite, and the affected design-route baselines. The
  collapsed managed-subject rail remains centered and Agent Settings parity now
  asserts the shared inline definition action.
