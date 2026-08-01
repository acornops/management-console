# MCP Empty-State Consistency

## Goal

Keep the target MCP server route visually and semantically consistent when its
catalog contains zero servers.

## Decisions

- The warm route canvas remains visible; inventory content uses the canonical
  bordered paper surfaces.
- `McpServersInventory` owns ready and empty inventory presentation, including
  the zero-count summary and table-scoped empty state.
- The route-level collection state continues to own initial loading and fatal
  error replacement.
- The route uses the shared `PageHeader` composition and disables its add menu
  when the current operator cannot manage MCP servers.
- The empty-state icon communicates server context and is not styled like an
  inactive add control.

## Work

- [x] Preserve the inventory shell for zero-server catalogs.
- [x] Adopt the shared route header and permission behavior.
- [x] Replace the ambiguous decorative add glyph.
- [x] Add regression coverage for the composed empty state.
- [x] Verify representative MCP routes and repository checks.

## Validation

- Focused MCP inventory and presentation tests: 33 passed.
- Full unit suite reached 171 files and 812 passing tests.
- Targeted Agent, cluster, and VM MCP route snapshots passed in desktop light,
  desktop dark, mobile light, mobile dark, and sidebar-constrained projects.
- `npm run lint`, `npm run contracts:check`, `npm run membership:check`,
  `npm run build`, and `npm run smoke:routes` passed.
- `npm run validate` reached browser snapshots and stopped on the unrelated
  desktop-light design-catalog screenshot timing out before comparison; the
  isolated rerun timed out at the same 30-second harness limit.
- A later MCP parity run was invalidated by another concurrent workspace
  process removing `packages/ui/dist` while Vite was serving it. Six tests had
  passed before the run was stopped.
- Final repository-wide residuals are unrelated to this change: `src/styles.test.ts`
  is 667 lines against the 650-line harness budget, and the main production
  JavaScript chunk is 555,030 bytes against the 358,400-byte bundle budget.
