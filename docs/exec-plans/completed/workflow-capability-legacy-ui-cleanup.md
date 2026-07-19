# Workflow Capability Legacy UI Cleanup

## Goal

Make the workflow capability experience reflect the current control-plane contract without legacy step-level scope, synthetic approval language, or dead MCP and skill editing state.

## Scope

- Replace per-step capability editing with one workflow capability-policy selector.
- Show every workflow approval gate in effective-access preview, including read-only gates.
- Derive Agent action-policy copy from the runtime-effective permission mode.
- Remove the non-effective legacy Agent approval policy from UI models and writes.
- Preserve exact semantic capability identifiers in technical summaries.
- Remove dead workflow UI model fields, props, actions, and compatibility-only presentation state.
- Keep control-plane wire names unchanged where they remain part of the API contract.

## Verification

- Add focused unit coverage for global capability-policy saving and effective Agent policy copy.
- Update workflow runtime assertions to reject removed legacy fields and interactions.
- Run targeted workflow tests, TypeScript, design-system checks, and the repository validation entrypoint.

## Completion

The work is complete when the workflow UI exposes one authoritative capability policy, all approval gates are visible, no audited legacy UI state remains in production code, and required validation evidence is recorded in the handoff.

## Outcome

- Replaced the step-derived editor with one workflow capability-policy editor.
- Rendered semantic capability identifiers verbatim in monospace technical rows.
- Removed decorative blocked-capability output and exposed only real workflow approval gates.
- Removed compatibility-only workflow view-model fields and write actions.
- Replaced synthetic Agent approval fields with the runtime-effective permission mode and approval gate.
- Preserved legacy URL aliases and control-plane wire names because they are non-visual compatibility boundaries.

## Validation evidence

- `npm run design:check` — passed across 294 source files.
- `npm run lint` — passed.
- `npm test` — 148 files and 863 tests passed.
- `npm run design:snapshots` — 19 passed, 1 intentionally skipped.
- `npm run smoke:fixtures` — 54 passed on isolated rerun after an intermittent blank-root failure in the third repeat of two Settings routes.
- `npm run smoke:mcp-parity` — 9 passed.
- `npm run membership:check` — passed.
- `npm run contracts:check` — passed.
- `npm run harness:check` — passed.
- `npm run build` — passed.
- `npm run smoke:routes` — passed.
