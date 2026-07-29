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
- Each Agent card exposes a distinct Quick chat action.
- Quick chat opens as a full-height dock beside the catalog on desktop and as
  an accessible modal drawer on narrower viewports. Its open Agent is
  represented by `panel=chat&agent=<id>` in the URL.
- The panel uses the existing Agent conversation APIs and can maximize to the
  full Agent Chat route.
- Closing Quick chat removes only its panel-specific route parameters.
- Disabled, draft, or unready Agents may be inspected in Quick chat, where the
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
- Agent cards expose route-backed Quick chat. It docks beside the catalog on
  wide screens, remains a modal drawer on narrow screens, and maximizes to the
  full Chat route.

## Validation

- `npm run lint` — passed.
- `npm test` — passed: 136 files, 707 tests.
- `npm run build` — passed.
- `npm run design:check` — passed across 389 source files.
- Focused route/navigation tests — passed: 21 tests.
- Focused Agent Quick chat desktop interaction — passed.
- Focused Agent Quick chat narrow-viewport drawer interaction — passed.
- Targeted Agent Chat, Settings, MCP Servers, Skills, and Tools visual snapshots
  passed in desktop/mobile and light/dark projects.
- `git diff --check` — passed.

The full `VITE_APP_DATA_MODE=control-plane npm run validate` aggregate was not
rerun; its constituent typecheck, unit, build, design-system, focused browser,
and targeted visual checks above cover this UI change.
