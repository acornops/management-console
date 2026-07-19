# Automatic workflow coordination

## Goal

Present workflow Agents as an order-independent peer selection. One selected
Agent runs directly; multiple selected Agents are coordinated by AcornOps.
Default new Workflows to inherited Agent capabilities, support advanced
restrictions including an explicit zero-capability Workflow, and manage
workflow-only AcornOps native tools from Agent capabilities.

## Scope

- Consume required `agentIds` and derived `executionMode`; remove public
  entry/delegation fields and Manager concepts.
- Add live selection feedback, Direct and AcornOps-coordinated labels, unioned
  capability selection, and unavailable-selection pruning.
- Update create, edit, review, workflow details, schedules, capability review,
  and coordinated traces.
- Separate AcornOps native tools from MCP-discovered tools and expose generated
  PDF artifacts as authenticated Workflow-run downloads.
- Preserve keyboard access, disabled reasons, English/Mandarin localization,
  narrow-screen stacking, dark theme, and reduced motion.

## Verification

- Targeted model, API, selection, review, schedule, trace, accessibility, and
  localization tests.
- `VITE_APP_DATA_MODE=control-plane npm run validate`
- Browser checks at 390x844, 768x1024, and 1440x1000 in light/dark and
  reduced-motion modes.

## Delivery

Shared branch: `feat/extensible-catalog-sources`.
Merge after the control-plane contract producer. No docs-website change is
required for the prompt-first target selection revision.

## Prompt-first target selection decision

- Target-bound workflow runs select one exact resource in the control message
  with `@target[Target name]`. The launch UI has no target picker or separate
  target selection state.
- Launch resolution derives `targetId` and `targetType` from the referenced
  catalog entry, filters suggestions through workflow target constraints, and
  blocks missing, ambiguous, unavailable, unknown, or out-of-scope references.
- Explicit capability restrictions use the workflow capability list. Inherited
  workflows use the selected Agents' current combined semantic capabilities.
- Custom workflow prompts offer an optional target placeholder action; saving
  does not require the placeholder. Legacy concrete `@cluster[...]` references
  remain accepted, while all new UI copy emits only `@target[...]`.
- Delivery continues on `feat/extensible-catalog-sources`, after control-plane.
  No docs-website change is required.

## Target workflow capability split

- `Target diagnostics` remains read-only; `Target remediation` is the separate
  approval-gated read-write starter.
- Both workflows select one Kubernetes or VM resource through the same exact
  `@target[...]` control-message interaction.
- Launch target detection recognizes both `target.diagnostics.read` and
  `target.remediation.write`; no picker or per-run target state is reintroduced.

## Prompt-first operator intent decision

- Free-form run intent is authored once in the workflow prompt. The launch UI
  does not render separate text fields for requested changes, review
  instructions, report titles, or investigation questions.
- Structured scope remains explicit where the runtime needs exact identity,
  including repository coordinates, target references, and incident-chat
  references.
- For compatibility with installed workflow definitions and current
  control-plane validation, the console mirrors the prompt into declared text
  inputs in the launch payload. This is transport compatibility, not a second
  authoring surface.

## Starter workflow usability decision

- A ready built-in workflow is runnable as-is. Editing is the only action that
  creates a custom draft, and that action is labeled `Customize workflow`.
- The header exposes one truthful primary action: `Launch workflow` when ready
  and active, `Activate workflow` when ready but inactive, or `Complete setup`
  when readiness is blocked. A disabled Launch action is not used as setup
  guidance.
- Built-in provenance is explicit, and execution access badges say
  `read-only run` or `read-write run` so capability mode is not confused with
  definition ownership.
- Customization remains available as a quiet header action. The repeated
  duplication notices are removed from workflow tabs, and the original
  built-in stays available after its editable copy is created.
