# Route Empty-State Standardization

## Goal

Give route-level empty collections one reusable visual and semantic pattern across
workspaces, Kubernetes clusters, virtual machines, Agents, workflows, schedules,
approval queues, members, audit history, and master-detail catalogs.

## Constraints

- Preserve existing route behavior, permissions, retry actions, creation actions,
  filters, and translated copy.
- Keep compact detail-panel absences compact; standardize their anatomy through
  the shared component without turning every missing field into a full-page state.
- Use existing theme, typography, spacing, icon, and button tokens in light and
  dark themes.
- Preserve unrelated uncommitted work in the repository.

## UX Acceptance Criteria

- Empty states share the same icon tile, title hierarchy, description typography,
  action spacing, centered measure, and accessible status semantics.
- Framed collection states use one dashed, token-driven boundary and minimum
  height across Clusters, VMs, and Agents.
- Embedded tables, queues, and master-detail panes reuse the same content anatomy
  without adding a conflicting nested border.
- The no-workspace route uses the same empty-state vocabulary and retains its
  primary create action and invitation guidance.
- Filtered-empty copy and recovery behavior remain distinct from genuinely empty
  inventory copy.

## Validation Plan

- Add focused shared-component rendering tests.
- Update route regression tests for shared empty-state usage.
- Run targeted Vitest files for the touched surfaces.
- Run `npm run validate` before handoff.

## Completion Criteria

- Shared component and covered route surfaces compile and pass targeted tests.
- Repository validation passes, or any environmental blocker is recorded with
  the exact failing command.
- Documentation and design-system catalog describe the canonical empty state.

## Validation Log

- `npm run lint` passed.
- Focused empty-state and route regression run passed: 9 files, 68 tests.
- Focused VM regression run passed: 1 file, 12 tests.
- `npm run design:check` passed across 270 source files.
- `npx playwright test tests/design-system/catalog.spec.ts --update-snapshots`
  passed all 8 desktop/mobile catalog checks after regenerating the four intentional
  visual baselines.
- `npm run smoke:fixtures` passed: 1 Playwright fixture smoke test.
- `npm run membership:check`, `npm run contracts:check`, and
  `npm run harness:check` passed.
- `npm run build` passed. Vite retained its existing large-chunk advisory.
- `npm run smoke:routes` passed.
- The final Schedules and Approvals regression run passed: 2 files, 8 tests.
- The final focused empty-state regression run passed: 7 files, 40 tests.
- A final `npm run design:check && npm run lint && npm run build && git diff --check`
  passed after the Schedules and Approvals route-composition changes.
- The fixture smoke route matrix now covers Schedules and Approvals; the updated
  `npm run smoke:fixtures` passed its Playwright test.
- The aggregate `npm run validate` reached the full unit suite but stopped on two
  unrelated in-progress theme token assertions: `src/styles.css` currently uses
  `--brand-orange: #FF703B`, while `src/styles.test.ts` still expects the prior
  OKLCH literal. The run reported 768 passing tests and 2 failures. Both files
  were already modified outside this task and were preserved.
- The full design snapshot command required loopback-server permission. Once run
  outside the sandbox, the empty-state catalog changes were verified and updated.
  Seven separate theme-behavior cases still time out while waiting for the theme
  trigger on the current in-progress login/theme implementation; those files are
  outside this task.
