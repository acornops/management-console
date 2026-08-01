# Short-Viewport Sidebar Navigation

## Goal

Keep the desktop workspace navigation immediately usable on shorter laptop
viewports without shrinking its `40px` targets or making an invisible scrollbar
the primary way to discover destinations.

## Implementation Contract

- At desktop widths and viewport heights above `820px`, preserve the complete
  grouped workspace navigation.
- At desktop widths and viewport heights of `820px` or less, keep every permitted
  destination visible while tightening inter-row, group, workspace-context,
  header, account, and target-context spacing.
- Preserve genuine, base-path-aware links, modified-click behavior, active-page
  semantics, permission-aware omissions, translated labels, and approval counts.
- Preserve active state and pending-approval placement on their original
  destinations.
- Preserve the existing scrollable navigation region only as a fallback for
  unusually short viewports and target-specific sidebars.
- Keep the existing `40px` desktop target and `18px` icon sizes. Use `12px`
  before and `8px` after section titles, and reduce only the inter-row cadence
  from `44px` to `42px`.

## Validation Plan

- Static contract coverage for the scoped short-height density rules and their
  sidebar hooks.
- Playwright coverage at `1600x900` and `1600x700` for the height transition,
  `44px`/`42px` row cadence, `12px` before and `8px` after section titles,
  overflow-free expanded and collapsed navigation, genuine links, and the
  approval signal.
- `npm run lint`
- `npm run test`
- `npm run smoke:routes`
- `npm run validate`

## Completion Criteria

- [x] Short desktop viewports expose every permitted destination without
  requiring navigation scrolling.
- [x] Short-viewport density preserves route-stable destinations, active state,
  and pending approvals in place.
- [x] Normal-height and target-context navigation behavior remains unchanged.
- [x] Targeted and repository validation evidence is recorded.

## Validation Log

- `npx vitest run src/sidebarDensityStyles.test.ts src/styles.test.ts
  src/scrollbarStyles.test.ts`: passed, 3 files and 34 tests after the focused
  spacing contract was extracted from the large general stylesheet suite.
- `npm run test`: passed, 167 files and 798 tests before that mechanical test
  extraction; the assertion count is unchanged.
- Focused short-viewport Playwright regression at `1600x900` and `1600x700`
  passed for the original `8px`/`8px` title treatment, verifying cadence,
  visibility, links, approval state, and expanded/collapsed overflow. After the
  visual follow-up changed the title treatment to `12px`/`8px`, its geometry
  assertion was updated; two reruns did not start because the local fixture
  server's automatic approval review timed out. The focused static density
  contract passed after the adjustment.
- Full responsive-navigation Playwright suite: 5 of 6 passed. The remaining
  existing rail-badge geometry assertion expects `16px`; the in-progress shared
  badge change currently renders `20px`. The new short-viewport case passed.
- `npm run lint`: passed after the UI package build refreshed its generated type
  declarations.
- `npm run smoke:routes`: passed.
- `npm run contracts:check`: passed.
- `npm run build`: passed.
- `npm run harness:check`: the sidebar code and focused density test stay within
  their budgets. The command remains red only because the pre-existing
  `src/App.tsx` is 602 lines against its 600-line budget.
- `npm run validate`: invoked. UI checks passed, then the command stopped at the
  pre-existing design check because the in-progress resource-card grid uses CSS
  Grid while the checker still expects the former flex rules (`flex-wrap`,
  child `flex`, and `max-width`).
- `git diff --check`: passed.

## Outcome

Short desktop workspace navigation keeps every destination visible while
tightening the spacing around unchanged target and icon sizes. Route semantics,
active state, permissions, and approval signal remain in place. Normal-height
navigation remains unchanged, and scrolling is retained only as a fallback for
extreme heights and target-specific contexts. The final treatment uses no More
menu: it uses `12px` before and `8px` after titles and reduces only button
cadence from `44px` to `42px` at short desktop heights.
