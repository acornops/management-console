# Target capability inventory parity

## Goal

Show every user-visible platform-native target-chat capability in Cluster Tools
and identify non-configurable AcornOps-provided tools without inventing local UI
state.

## Interaction

- Reuse the existing Tools inventory table.
- Show platform-native tools as enabled and provided by AcornOps.
- Disable their toggle and replace configuration actions with a clear
  non-configurable state.
- Keep MCP and Skills in their existing dedicated inventories.

## Verification

- Target tool source/configuration rendering tests.
- Type, design-system, and control-plane contract validation.

## Outcome

- Cluster Tools renders platform-native target-chat tools with AcornOps
  provenance and no misleading configuration action.
- The shared provenance badge appears on every AcornOps-provided built-in tool
  and on the built-in MCP server and Agent surfaces; custom Agents continue to
  show their actual owner, and origin still controls configurability. Workflow
  publisher attribution appears in the template catalog instead of on installed
  Workflow definitions.
- Fixture mode now keeps built-in Tools separate from MCP inventory.
- Focused unit/API tests and a rendered Playwright parity smoke pass, along with
  TypeScript, design-system, and contract checks.
