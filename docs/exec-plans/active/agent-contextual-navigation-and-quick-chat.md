# Agent Contextual Navigation and Quick Chat

## Goal

Make Agent discovery and inspection follow the same predictable resource-detail
model as Kubernetes clusters and virtual machines while keeping Agents
workspace-owned automation definitions.

## UX Acceptance Criteria

- The Agents catalog remains under Workspace Automation.
- Opening an Agent detail route replaces workspace navigation with an
  Agent-specific contextual navigation surface on desktop and mobile.
- Agent navigation opens directly to Chat under Operations, groups MCP Servers,
  Skills, and Tools under Capabilities, and keeps Agent Settings separate.
- Agent detail routes remain shareable and restore the selected section.
- Each Agent card exposes a distinct Chat action with an Agent-specific accessible name.
- Chat opens as a full-height dock beside the catalog on desktop and as
  an accessible modal drawer on narrower viewports. Its open Agent is
  represented by `panel=chat&agent=<id>` in the URL.
- The desktop dock slides in from the right and exits in the same direction
  while remaining a layout sibling. Its opening width replaces one catalog
  column so Agent cards keep their full-layout width as the catalog settles
  immediately into two columns instead of being covered by the dock.
- Agent cards do not animate across grid rows when the column count changes;
  the dock entrance is the only spatial motion in this interaction.
- Reduced-motion users receive the same layout change without transitional
  movement.
- The panel uses the existing Agent conversation APIs and can maximize to the
  full Agent Chat route.
- Closing Chat removes only its panel-specific route parameters.
- Disabled, draft, or unready Agents may be inspected in Chat, where the
  existing conversation readiness state explains why sending is unavailable.

## Target Boundary

| Concept | Shared resource model | Kubernetes-specific | VM-specific | Agent-specific |
| --- | --- | --- | --- | --- |
| Contextual detail shell | UI pattern | Cluster identity and operations | VM identity and operations | Agent identity and operations |
| Capability navigation | MCP, Skills, Tools | Target-provided capabilities | Target-provided capabilities | Assigned/effective Agent capabilities |
| Side chat panel | Resizable desktop dock with responsive drawer fallback | Target triage runtime | Existing target behavior unchanged | Agent conversation runtime |
| Catalog ownership | Workspace route | Inventory | Inventory | Automation |

## Implementation Notes

- Agent detail routes use the same app-shell composition as cluster and VM
  detail routes. There is no Agent-specific page frame.
- Chat renders directly into the app content region.
- MCP Servers, Skills, and Tools reuse the shared target administration views;
  Agent-specific data-source adapters keep their requests on Agent APIs.
- Settings and the Agents catalog each use one standard `PageShell`.
- Agent cards expose route-backed Chat. It docks beside the catalog on
  wide screens, uses the shared assistant frame's card-aware opening width,
  remains user-resizable, falls back to a modal drawer on narrow screens, and
  maximizes to the full Chat route. Cluster, VM, and Agent docks share that
  frame and width policy.

## Validation

- `npm run lint` — passed, including `@acornops/ui` and application typechecks.
- `npm run test` — passed: 163 files, 786 tests.
- `npm run harness:check` — passed after focused extraction of navigation and
  page contracts, target administration helpers, workflow launch actions, and
  style-contract coverage. No line budget was raised or excepted.
- `npm run design:check` — passed across 426 source files.
- `npm run design:adoption` — passed with zero violations and zero temporary
  exceptions.
- `npm run contracts:check` and `npm run membership:check` — passed.
- `npm run build` — passed: 2,790 modules transformed.
- `npm run bundle:check` — passed across 72 JavaScript chunks; the largest was
  `vendor-react` at 312,686 bytes.
- `npm run smoke:routes` — passed.
- Focused Agent Chat desktop and narrow-viewport browser tests — passed:
  2 tests.
- `npm run smoke:fixtures` — 191 of 195 repeated tests passed in the long
  aggregate; two third-repetition server timeouts both passed immediately in
  isolation. The two unrun cases were a consequence of the timed-out worker.
- `npm run smoke:mcp-parity` — passed: 21 tests across three repetitions after
  aligning the Agent parity test with the shared MCP server form, review step,
  and overflow actions.
- The local aggregate visual stages remain platform-baseline limited:
  upstream refreshed the Linux design-catalog baselines, while the macOS
  catalog baselines are stale and the route suite has no macOS baselines.
  Behavioral design-system coverage passed; no snapshot was accepted blindly
  or added to this feature.
- `git diff --check` — passed.
