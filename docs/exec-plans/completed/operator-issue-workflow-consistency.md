# Operator Issue and Workflow Consistency

## Goal

Make the cluster issue flow accurately distinguish durable issues, assistant
triage, and related workflow runs while preserving the existing trigger model.

## Scope

- Correct singular issue counts and namespace presentation.
- Label assistant triage as an assistant action rather than a workflow run.
- Keep existing issue-linked workflow activity and navigation unchanged.
- Repair frontend fixture resource payloads so the Resources view can verify
  operational state consistently.

## Constraints

- Limit the shorter `Events` wording to the trigger tab.
- Do not add assistant-to-workflow or assistant-to-issue correlation.
- Do not change workflow trigger, dispatch, or backend contracts.
- Reuse existing design-system components and route behavior.

## Validation

- Add focused tests for issue labels, namespace fallback, and fixture resource
  mapping.
- Run the non-browser management-console validation gates in control-plane
  mode.
- Capture and inspect the affected operator screens after the change.

## Outcome

- Corrected issue-count grammar and made the issue summary readable without
  awkward embedded zero-count phrasing.
- Corrected namespace presentation without losing the scoped Kubernetes object
  from the assistant prompt.
- Renamed the manual action to `Open assistant` and kept the related workflow
  activity visually and behaviorally separate.
- Switched the issue table to a responsive card below the `2xl` breakpoint so
  action controls remain visible alongside the cluster navigation.
- Kept a fresh Pending rollout visible in Resources without creating a durable
  Current Issue.
- Repaired the normalized fixture rows used by this flow so Resources presents
  the audited healthy, CrashLoopBackOff, and fresh Pending states correctly.

## Verification

- Focused Vitest coverage passes for namespace fallback, fixture resource
  mapping, localization topology, and cluster mapping.
- Full Vitest, TypeScript, contract, harness, membership, route-smoke,
  design-source, and control-plane production-build checks pass.
- In-app browser inspection at 1280x720 confirms the responsive issue card,
  correct namespace, singular labels, Pending-resource visibility, and that
  `Open assistant` opens the assistant with both Pod scope and namespace while
  leaving the workflow activity count unchanged.
- Focused operator Playwright coverage passes for cluster, VM, and workspace
  overview states, including compact layouts and recoverable failures.
- The full repeated fixture and MCP-parity browser suites pass.
