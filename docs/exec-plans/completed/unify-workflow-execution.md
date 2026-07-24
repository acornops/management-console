# Unified Workflow execution

## Goal

Present Workflow Agents as an order-independent specialist selection. One
selected Agent produces a specialist root run; multiple selected Agents produce
an internal coordinator root with delegated specialist children.
Default new Workflows to inherited Agent capabilities, support advanced
restrictions including an explicit zero-capability Workflow, and manage
workflow-only AcornOps native tools from Agent capabilities.

## Scope

- Consume required `agentIds` and derived `executionMode`; remove public
  entry/delegation fields and Manager concepts.
- Add live selection feedback, Direct and AcornOps-coordinated labels, unioned
  capability selection, and unavailable-selection pruning.
- Update create, edit, review, workflow details, schedules, capability review,
  and coordinated traces.
- Preserve keyboard access, disabled reasons, English/Mandarin localization,
  narrow-screen stacking, dark theme, and reduced motion.

## Verification

- Unit tests: 112 files and 612 tests passed.
- Design snapshots: 19 passed and 1 skipped.
- Fixture browser checks: 129 passed. One initial browser-context startup timed
  out; the exact test passed on three consecutive reruns.
- MCP parity browser checks: 21 passed.
- Design, lint, membership, contract, harness, build, and route smoke checks:
  passed.

## Delivery

Deliver as one coordinated breaking contract change after the control-plane
contract producer. No compatibility layer or data migration is required.
