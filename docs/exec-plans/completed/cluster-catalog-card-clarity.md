# Target Catalog Card Clarity

## Goal

Make cluster and VM connection state immediately understandable and keep
connected target cards focused on the current signals operators need while
scanning.

## Target Boundary

| Concept | Shared target model? | Kubernetes-specific? | VM-specific? | Notes |
| --- | --- | --- | --- | --- |
| Catalog card anatomy | yes | no | no | Share status placement, setup composition, graph height, freshness row, and footer density. |
| Setup status | yes | no | no | Use `Not connected` while the target registration exists but its agent is not installed. |
| Setup action | capability | Install AgentK | Install AgentV | Keep each target's existing route and permission check. |
| Telemetry metrics | interface | CPU and memory | CPU, memory, and root disk | Use the control plane's actual percent fields; retain load averages for the detailed VM telemetry view. |
| Operational footer | interface | scope, effective access, exceptional node readiness | hostname and log coverage | Share labeled presentation only; preserve target-specific meaning and style exceptions without adding routine counts. |

## Constraints

- Preserve the existing control-plane-backed status and telemetry models.
- Preserve the in-progress exception-only status-pill and 27rem card-grid work.
- Keep setup, telemetry retry, card activation, and action-menu behavior intact.
- Keep the compact current trend graph and its assistive-technology summary.

## UX Acceptance Criteria

- A registered cluster without an installed agent is labeled `Not connected`.
- A registered VM without an installed agent uses the same status and setup
  composition.
- The setup card presents one explanation and one Install Agent action.
- Setup cards do not render unavailable metrics, an empty chart, repeated
  progress labels, or operational details that are not meaningful yet.
- Connected cards show current CPU, memory, a compact trend, freshness, scope,
  and access posture without redundant trend-axis copy.
- Connected VM cards mirror that hierarchy with CPU, memory, freshness,
  optional hostname, and log-source coverage. Inventory and issue counts stay
  out of the footer because they do not communicate an actionable state at a
  glance; issues already drive the exception status.
- VM freshness remains visible when only one usable metric sample exists; the
  graph still waits for enough samples to represent a trend.
- Stale freshness and missing log coverage use warning emphasis. Footer labels
  remain visible, and cluster node readiness appears only when not all observed
  nodes are ready.
- Warning, finding, disconnected, and error status pills remain visible.

## Validation Log

- `npm run lint` passed.
- Focused VM metric mapping and telemetry freshness tests passed: 2 files, 6
  tests.
- An earlier `npm run test` passed 177 files and 827 tests. A later run after
  unrelated dirty-worktree changes completed with 827 passing tests and one
  existing i18n-resource failure for five missing `targetSkills.*` keys.
- Focused cluster and VM catalog browser suite passed: 5 tests.
- Affected cluster and VM design routes passed across desktop light, desktop
  dark, mobile light, mobile dark, and sidebar-constrained projects: 5 tests.
- `npm run design:check` passed across 438 source files.
- `npm run design:adoption` passed with zero violations and zero temporary
  exceptions.
- `npm run build` passed after the final CPU, memory, disk, freshness, and
  footer changes.
- `npm run contracts:check` passed.
- `npm run harness:check` passed.
- `npm run smoke:routes` passed.
- The full `npm run validate` run reached design-route validation but was
  stopped after unrelated existing Agents-page visual baselines failed in the
  dirty worktree. The two affected catalog routes were then run directly and
  passed across every project.

## Completion Criteria

- Focused component and fixture coverage passes.
- Repository lint, test, build, route smoke, contract, and harness checks pass.
- Browser fixture verification confirms both connected and not-connected cards.
