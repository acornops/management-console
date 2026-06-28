# Automation Surface Design

## Feature Summary

Build the full Automation surface in `management-console`: sidebar IA grouping `Inventory` (`Kubernetes`, `Virtual Machines`) and `Automation` (`Agents`, `Workflows`), a new durable `Agents` workspace page, and a reshaped `Workflows` page. The user is a platform operator or admin configuring automation capabilities and launching governed workflow runs.

## Primary User Action

Operators should understand what automation can do, where those capabilities come from, and how a workflow narrows them before any run starts.

## Design Direction

Color strategy: Restrained. Preserve the original AcornOps vocabulary: warm OKLCH neutrals, Outfit typography, thin borders, compact operational density, and orange filled buttons only for workflow launch or activation.

Scene sentence: A platform operator reviews automation permissions on a large monitor during normal incident follow-up, needing calm clarity rather than drama.

Anchor references: Linear for resource/detail density, Stripe Dashboard for permission-sensitive configuration, GitHub Actions for run trace legibility.

Visual direction: carry visual probes A and B into the first build. Use probe C only as the run-detail direction for the Runs tab. Do not replace AcornOps colors, typography, or button hierarchy with the probe styling.

## Scope

Fidelity: production-ready.

Breadth: full Automation surface, including nav, Agents page, Workflows IA, fallback data, consumer contract docs/client types.

Interactivity: shipped-quality React routes/components using existing patterns.

Contract scope: management-console consumer boundary only. Control-plane producer implementation is out of scope and should be handled in a coordinated follow-up.

## Layout Strategy

Use paired resource pages. Agents and Workflows each use a library/detail layout rather than a new command-center overview. Sidebar sections change from `Operations` to intent groups: `Inventory` and `Automation`, with Administration kept separate. Agents detail exposes capability provenance clearly: MCP servers, tools, skills, target scope, context scope, approvals, workflows using the agent, health/test, and audit preview.

## Key States

- Default: populated fallback agents and workflows.
- Empty: no agents or no workflows, with creation-oriented copy.
- Loading: skeleton or quiet loading rows where control-plane data would load.
- Error: consumer API failure falls back to local catalog with a visible warning.
- Permission-limited: create/edit controls disabled with clear permission copy.
- Dirty edit: unsaved changes in agent/workflow config.
- Success: saved agent/workflow state confirmation.
- Run states: queued, running, waiting approval, cancelling, cancelled, succeeded, failed.

## Interaction Model

Agents: search/select an agent, inspect details, configure durable capability sources, scopes, approval defaults, and trust policy using inline panels.

Workflows: select workflow, assign primary and supporting agents, configure targets/context, review effective capabilities, disable or approval-gate capabilities, then launch. Workflows do not directly add MCP/tools/skills.

Runs: show governed run trace and a control-message composer, not an unconstrained chat room.

## Content Requirements

Use terms from `info.md`: `Agents`, `Workflows`, `Primary agent`, `Supporting agents`, `effective runtime access`, `workflow envelope`, `capability gate`, `run mode`, `approval constraints`, `control message`. Avoid implying workflow-owned tools. Empty/error copy must explain fallback and pending backend support honestly.

## Implementation References

- Impeccable references: `spatial-design.md`, `typography.md`, `interaction-design.md`, `responsive-design.md`, `ux-writing.md`, `color-and-contrast.md`.
- Local references: `docs/design-docs/core-beliefs.md`, `docs/design-docs/typography.md`.

## Open Questions

Exact Agent API producer implementation is out of scope. The UI should define consumer docs/types and use fallback/local data until control-plane routes land.
