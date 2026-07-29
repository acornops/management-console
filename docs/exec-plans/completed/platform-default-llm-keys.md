# Platform default LLM credentials

Status: complete

## Goal

Make workspace AI settings distinguish inherited platform defaults from
workspace overrides and omit workspace-creation AI step 3 when a newly created
workspace inherits at least one configured provider.

## Decisions

- The wizard confirms inherited readiness through the existing workspace AI
  settings API after workspace creation.
- If that readiness check fails, the existing AI setup step remains available.
- Workspace administrators may replace an inherited default with a write-only
  workspace key.
- Deleting a workspace override means returning to the platform default.

## Validation

- Focused helper, API-shape, and AI settings tests.
- `npm run lint`, `npm run test`, `npm run contracts:check`,
  `npm run harness:check`, `npm run smoke:routes`, and `npm run validate`.

## Outcome

- AI Settings distinguishes inherited defaults from exact workspace overrides.
- Removing an override restores the inherited default, while adding a workspace
  key replaces it only for that workspace.
- Workspace creation waits for effective provider status and omits AI step 3
  when any platform default is inherited; status failures retain the step.
- Lint, 679 tests, design, contracts, harness, build, and route smoke checks
  passed.
