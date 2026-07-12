# AgentK Tool Security Hardening

## Goal

Remove remediation-specific approval UI behavior while preserving generic and
atomic write approval rendering.

## UX Acceptance Criteria

- No `apply_remediation` special case remains.
- Restart and scale approvals remain clear.
- Scale-to-zero and HPA override confirmations are visible in advanced details.

## Validation Log

- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed; 695 tests.
- Workspace validation: passed.

## Completion Criteria

Management-console validation passes in control-plane data mode.
