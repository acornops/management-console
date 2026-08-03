# MCP tool capability count consistency

## Goal

Keep MCP discovery, persisted tool capability, catalog summaries, and tool
management views aligned for both enabled and disabled tools.

## Scope

- Preserve conservative MCP annotation inference: only an explicit
  `readOnlyHint: true` without `destructiveHint: true` is read-only.
- Add explicit read-only and write-capable totals to target MCP catalog server
  counts without changing the existing configured/effective write semantics.
- Consume the additive fields in the management console with a compatibility
  fallback for an older control plane.
- Keep long discovered-tool lists reachable by allowing the review body to
  shrink and scroll within the bounded create dialog.

## Validation

- Focused LLM gateway discovery tests.
- Focused control-plane catalog tests and contract checks.
- Focused management-console mapper and MCP inventory tests in control-plane
  data mode.
- Workspace platform contract check.

## Outcome

- Confirmed the gateway infers read-only only from an explicit qualifying MCP
  annotation and preserves the inferred or manually selected capability when
  persisting tools.
- Added capability totals that include disabled tools, eliminating the catalog
  and tool-management mismatch.
- Made the create-flow review body a flexing scroll region so long tool lists
  remain reachable while the dialog header and actions stay visible.
- Focused MCP tests and the full control-plane-data-mode management-console
  validation passed, along with cross-repository contract checks.
