# Platform Capabilities Defaults

## Goal

Render the workspace's initialization snapshot in existing Agent, Kubernetes,
and Virtual Machine MCP and skill inventories without introducing navigation
or layout changes.

## Constraints

- Reuse existing inventory rows and enable/credential/import flows.
- Resolve inherited defaults against a non-empty `availableIn` array containing
  any combination of `agents`, `kubernetes`, and `virtual_machines`. **All**
  means all three destinations and is not a separate persisted value.
- Show a small `Platform default` provenance label.
- Allow enablement according to existing workspace permissions; after
  enablement, the item becomes a normal workspace-owned installation.
- Disallow source edit and removal for untouched inherited entries.
- Keep materialized defaults and locally added MCP servers and skills fully
  manageable.
- Do not expect later Platform Admin changes to update an existing workspace.
- Keep workspace and individual MCP credential setup in the existing
  Management Console flows; Platform Admin never supplies credentials or
  credential ownership.
- Keep the current Management Console Agent, Kubernetes, and Virtual Machine
  add/import UI and navigation unchanged. The Platform Admin creation dialogs
  mirror the shared target MCP and Git skill-import field sets, button
  hierarchy, and overlay anatomy without creating a new Management Console
  screen.
- Platform Admin skill import supplies a public GitHub or GitLab repository,
  ref, and subpath. The import operation resolves and pins the commit and
  validates the Markdown bundle instead of asking for a manual commit SHA,
  custom API base, or browser file upload.
- Do not change built-in tool inventories or native target capabilities.

## Validation

- Typecheck, the 702-test unit suite, harness, membership, contracts, build,
  bundle budget, and the focused inherited MCP credential-flow test passed.
- Design-system snapshots remain unchanged; the local Node 25/browser run
  rendered unrelated catalog baselines at different viewport dimensions.

## Completion Criteria

Untouched initialization entries are visibly distinguished and safe while all
existing local capability workflows, credential handling, Git import behavior,
and native tool surfaces remain intact. Snapshot entries appear only on the
Agent, Kubernetes, and Virtual Machine surfaces included in their
`availableIn` array.
