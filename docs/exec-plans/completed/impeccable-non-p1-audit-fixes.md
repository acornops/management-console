# Impeccable Non-P1 Audit Fixes

## Goal

Resolve every P2 and P3 issue from the July 19 management-console Impeccable
audit while leaving both P1 findings unchanged.

## Constraints

- Do not change the mobile Assistant composer reflow behavior.
- Do not change light-theme accent colors or contrast tokens.
- Preserve concurrent work already present in the dirty worktree.
- Keep every `src/**/*.ts` and `src/**/*.tsx` file within the 650-line harness
  budget.

## UX Acceptance Criteria

- The programmatically activated chat attachment input is not exposed as an
  unnamed assistive-technology control.
- VM resource result headings follow the page heading without skipping a level.
- Production UI code uses property-specific transitions instead of
  `transition-all`, and cluster back-link hover motion does not animate layout.
- Chat view, chat controller, and Agent capability code remain behaviorally
  equivalent after focused extraction.

## Validation Plan

- Targeted Vitest coverage for chat, VM resources, navigation, and Agent
  capabilities.
- `npm run lint`
- `npm run harness:check`
- `npm run design:check`
- `VITE_APP_DATA_MODE=control-plane npm run validate`
- Re-run the relevant browser audit probes at 390x844 and 1440x1000.

## Completion Criteria

- All P2 and P3 audit findings are fixed.
- Harness, lint, design checks, and repository validation pass.
- The audit is rerun and any residual risks are documented.

## Validation Results

- `npx vitest run ...` targeted suite: 10 files and 54 tests passed.
- `npm run test`: 162 files and 951 tests passed.
- `npm run lint`: passed.
- `npm run harness:check`: passed; all source files are within the 650-line
  budget.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed, including 19
  design-system browser checks with one expected skip, 114 repeated fixture
  checks, 21 repeated MCP parity checks, contracts, membership, production
  build, and route smoke.
- Impeccable browser rerun: 28 routes in desktop light and mobile dark modes;
  no heading issues, runtime errors, page overflow, missing alternative text,
  or newly exposed unnamed controls. Both Members timeouts passed on immediate
  fresh-context retry.

## Residual Risks

- The two excluded P1 findings remain: light-theme accent contrast and the
  narrow-screen Assistant composer.
- The production build succeeds but warns that the 503.88 kB minified entry
  chunk is slightly above Vite's 500 kB warning threshold.
