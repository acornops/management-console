# Target chat slash references

## Goal

Let operators reference an exact enabled target tool or skill from the Cluster
Assistant composer by typing `/`, without changing the existing `@` prompt
resource marker syntax.

## UX boundaries

- `/` opens one keyboard-accessible picker grouped into Tools and Skills.
- Selecting an item removes the slash query and adds a removable reference chip
  above the textarea. The plain prompt remains editable and readable.
- Tool rows show the user-facing name, read/write capability, and MCP or platform
  origin when available. Skill rows show name and description.
- References are submitted as structured IDs through the control-plane client;
  chip text is never treated as authorization.
- A write tool unavailable in the current run mode is omitted from the picker.
- Stale or denied references fail explicitly at submission and remain in the
  composer for correction.
- Preserve the existing capability preview, attachment flow, model selector,
  prompt-reference markers, keyboard submission, and target-neutral chat UI.

## Target boundary

| Concept | Shared target model | Kubernetes-specific | VM-specific | Notes |
| --- | --- | --- | --- | --- |
| Slash reference UI | yes | no | no | Reads the target capability preview. |
| Tool reference | capability | AgentK-backed tools | AgentV-backed tools | Browser sends an opaque runtime tool ID. |
| Skill reference | capability | no | no | Browser sends the target skill ID. |
| Permission and approval | policy | Kubernetes RBAC downstream | VM policy downstream | Existing control-plane and run approval rules remain authoritative. |

## Validation

- Picker trigger, filtering, keyboard navigation, selection, removal, and stale
  reference recovery tests.
- API mapping tests for structured references.
- `VITE_APP_DATA_MODE=control-plane npm run validate`.
