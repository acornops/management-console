# Design system 20/20 hardening

## Goal

Close the remaining design-system quality gaps with executable evidence, then
raise the tracked score only after the full repository validation passes.

## Scope

- Add real-route visual, WCAG 2.1 AA, 200% text reflow, and forced-colors focus checks.
- Make the public `@acornops/ui` catalog inventory explicit and mechanically complete.
- Strengthen semantic typography and contrast guardrails.
- Seed populated approval and reduced-permission fixture states.
- Split oversized production chunks and enforce a bundle-size budget.
- Refresh snapshots and design-system documentation.

## Verification

- `npm run design:check`
- `npm run design:snapshots`
- `npm run design:routes`
- `npm run smoke:fixtures`
- `npm run bundle:check`
- `npm run validate`

## Progress

- [x] Real-route visual and accessibility matrix
- [x] Shared contrast fixes and token-level contrast tests
- [x] Public component catalog inventory
- [x] Populated approval and reduced-permission fixtures
- [x] Bundle budget
- [ ] Full validation and final score
