# MCP tool group controls

## Goal

Let operators stage one enable or disable action for every read-only or
write-capable tool exposed by an MCP server, including tools beyond the first
paginated page.

## Constraints

- Preserve the existing per-tool control-plane contract and staged Save flow.
- Keep read-only and write-capable actions separate so write access remains an
  explicit choice.
- Do not change tool settings until the operator saves the dialog.

## UX acceptance criteria

- Each non-empty capability section has one accessible group switch.
- A fully enabled group switches off; a partial or disabled group switches on.
- Activating a group control drains remaining tool pages before staging the
  change, so "all" never means only the visible page.
- Group controls respect permissions and pending/loading states.

## Validation log

- `npx vitest run src/features/targets/admin/McpServerToolsDialog.test.tsx src/hooks/useCursorCollection.test.ts`: 15 tests passed.
- `npx playwright test --config=playwright.mcp-parity.config.ts tests/mcp-parity/target-tools-parity.spec.ts`: focused MCP browser flow passed.
- `npm run validate`: 194 test files and 944 tests passed, along with UI package, design, type, membership, contract, harness, production build, bundle, and route smoke gates.

## Completion criteria

- Focused component and pagination tests pass.
- Repository validation passes.
- English and Chinese copy remains in sync.

## Outcome

- Added separate read-only and write-capable group switches to the MCP tool
  dialog while retaining per-tool switches. Capability counts sit beside their
  section titles so every group switch aligns with the per-tool switch column.
- Group changes remain staged until Save and can be reset with the existing
  dialog action.
- Bulk actions drain every remaining cursor page before staging overrides, so
  the action covers the complete server tool inventory.
