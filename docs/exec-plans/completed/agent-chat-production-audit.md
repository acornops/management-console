# Agent chat production audit

Status: completed 2026-08-01

## Outcome

- Simplified direct-conversation identity and removed synthetic Workflow execution
  fields from API types and fixtures.
- Confirmed the UI consumes the neutral run shape and persisted conversation
  lifecycle status/expiry.
- Found no remaining direct Agent-chat compatibility branch in console code.

## Validation

- `npm run contracts:check`, `npm run build`, and `npm run smoke:routes` pass.
- The sequential unit suite passes 164 files and 781 tests.
- Canonical `npm run validate` reaches the existing design-system check and
  stops on unrelated `NavCountBadge` nonsemantic typography utilities.
