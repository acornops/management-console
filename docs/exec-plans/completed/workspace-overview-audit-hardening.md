# Workspace overview audit hardening

## Goal

Resolve the confirmed workspace overview audit findings without changing the
page's restrained operator-ledger composition.

## Scope

- Make issue and virtual-machine load failures truthful, announced, and retryable.
- Preserve route semantics with real links for target and investigation navigation.
- Bound overview collection loading and rendering.
- Reduce the production entry chunk below the configured warning threshold.
- Add real-browser coverage for semantics, keyboard focus, themes, and mobile geometry.

## Constraints

- Preserve existing staged and unstaged Management Console work.
- Keep the control-plane API boundary unchanged.
- Reuse shared components and route helpers.
- Do not alter unrelated product surfaces.

## Validation

- Targeted overview, style, routing, and collection tests.
- Design-system and TypeScript checks.
- Production build with before-and-after chunk evidence.
- Desktop and mobile Playwright fixture checks.
- Full `npm run validate` before handoff.
- Re-run the Impeccable workspace audit after fixes.

## Outcome

- Collection failures now use explicit live error or retained-data warning states with retry controls.
- Overview target and investigation navigation now uses real route-aware links.
- Issues load in a bounded 24-item manual page and VMs in a quota-bounded 50-item manual page.
- Chat runtime, copilot, and dialogs are deferred until their routes or overlays need them.
- The production entry chunk fell from 813.71 kB / 236 kB gzip to 489.48 kB / 137.61 kB gzip.
- Focused desktop, failure-state, and narrow dark-mode browser audits pass.
- The full validation chain passed through browser suites, membership, and contracts; after resolving
  concurrent line-budget changes, harness, build, route smoke, and focused audit checks also pass.
