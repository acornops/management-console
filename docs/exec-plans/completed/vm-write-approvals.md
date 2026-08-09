# VM write approvals

## Goal

Let authorized users request and approve AgentV `restart_service` calls from VM
chat while preserving read-only behavior for roles without write-run access.

## Outcome

- Derived VM chat access from workspace permissions and requested `read_write`
  only when chat and write-run capabilities are both present.
- Exposed approval controls only to users with `create_read_write_runs`, matching
  the existing Kubernetes assistant policy.
- Updated VM assistant copy to explain automatic reads and approval-gated
  restarts.
- Corrected fixture AgentV metadata and target-scoped capability previews so the
  local UI advertises the real `get_service` and `restart_service` contracts.

## Validation

- `npm run validate`: passed 206 files and 1,009 tests plus design, typecheck,
  membership, contract, harness, build, bundle, and route checks.
- Focused fixture Playwright coverage verifies the VM assistant footer and the
  visible `restart_service` capability.

## Release impact

Ship in management console `0.0.1-experimental.35` before publishing the AgentV
write-capable platform matrix.
