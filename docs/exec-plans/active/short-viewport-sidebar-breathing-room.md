# Short-Viewport Sidebar Breathing Room

## Goal

Keep desktop workspace navigation calm and readable on short laptop viewports
without compressing the shell, section, or row rhythm.

## Decision

- Preserve the normal expanded-sidebar spacing at every desktop viewport height.
- Keep destination rows at `40px`, icons at `18px`, and inter-row cadence at
  `44px` in expanded navigation.
- In the collapsed rail only, reduce the inter-icon gap to `2px` for a `42px`
  cadence without shrinking targets.
- Let the existing independently scrollable navigation region handle content
  that does not fit between the pinned header and account controls.
- Keep account controls pinned and preserve genuine links, active-page
  semantics, permissions, translated labels, and operational badges.
- Do not introduce a disclosure menu or hide destinations to save height.

This supersedes the density behavior documented by the completed
`short-viewport-sidebar-navigation` plan. That plan remains historical evidence
for the prior implementation.

## Validation

- Update the static sidebar spacing contract.
- Update the responsive-navigation browser contract for `1600x900` and
  `1600x700`.
- Run focused Vitest coverage, design-system checks, and the affected
  responsive-navigation Playwright case when the local browser server can bind.
- Run repository validation and record unrelated dirty-worktree blockers.

## Completion Criteria

- Short desktop viewports retain the normal section and row rhythm.
- Collapsed rails use the tighter `42px` icon cadence at every desktop height.
- The navigation region scrolls independently when its content exceeds the
  available height.
- Workspace and account controls remain outside that scrolling region.
- Normal-height, collapsed-rail, mobile-drawer, link, and badge behavior do not
  regress.
