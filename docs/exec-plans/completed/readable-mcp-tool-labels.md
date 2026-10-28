# Readable MCP tool labels

## Goal and scope

Complete the user-approved display cleanup in management-console only. Workflows
show canonical MCP names, approval details use the existing canonical tool
reference, and missing MCP descriptions do not fall back to internal aliases.
Internal IDs, execution, authorization, stored events, and decision payloads stay
unchanged. No backend, deployment, or API schema changes are needed.

## Design

Use metadata already returned by the API. Agent definition snapshots use
`toolName`, whereas the live MCP management catalog uses `name`; the console
models those response shapes separately. Workflow rows retain alias IDs and use
canonical names, qualified by server when names collide. Approvals display
`toolRef.toolName` plus the server ID when present; legacy records retain their
exact existing name. Extend the console DTO to describe that existing optional
field. Do not decode aliases: their readable segment can be truncated.

This follows the proposed approach approved in chat. String stripping cannot
recover full names; changing internal identities would exceed this display fix.
Reuse the clean current checkout and leave changes available for review.

## Implementation and validation

- [x] Add failing regression tests for real hashed aliases, duplicate names,
  legacy records, approval references, and missing descriptions.
- [x] Update workflow labels, approval rendering/DTO, and MCP description fallback.
- [x] Run targeted unit tests and affected workflow/approval browser checks.
- [x] Run `VITE_APP_DATA_MODE=control-plane npm run validate` under Node.js 22.
- [x] Review the diff, record results, and move this plan to completed.

## Review focus

Full names must survive alias truncation. Duplicate names must remain
distinguishable without changing identity. Built-ins and records without metadata
must remain truthful. Approval references must not change decision targets.
Missing descriptions must not reveal the alias as the primary tool label.

## Evidence

Initial regression run: four expected failures (workflow canonical/collision
labels, approval canonical identity, and missing description fallback), then green.
Review identified the pre-existing mismatch between agent snapshot `toolName`
and catalog `name`. A second red run using the real snapshot shape reproduced
four failures. The corrected snapshot DTO, workflow reader, and fixtures passed
31 focused tests, including the real response through `mapApiAgent` with two
distinct tools. No producer/API schema changed.

The independent reviewer found no other required changes. Existing chat/run trace
labels and disabled-installation filtering remain outside this bounded patch.
Records without canonical metadata continue to display exact stored identifiers.

Final validation, all with `/opt/homebrew/opt/node@22/bin` first on `PATH`:

- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed in a temporary
  checkout of baseline `3f36b7501698dd8ae4a6bfe2c8517def3e770c5b` plus only this
  patch; 232 test files / 1,199 tests, type checks, design checks, contracts,
  harness, build, bundle budgets, and route smoke all passed.
- `npm run test -- src/pages/workflows/workflowAgentCapabilities.test.ts src/features/approvals/ApprovalReviewDialog.test.tsx src/pages/agents/agentCapabilityAdminAdapters.test.ts src/services/control-plane/workflowApprovalReview.test.ts`:
  31 tests passed after the snapshot correction.
- `FIXTURE_APP_PORT=4197 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/mcp-tool-labels.spec.ts tests/fixtures/approval-review.spec.ts`:
  31 passed. Approval rendering/decision coverage remained unchanged by the
  subsequent workflow snapshot correction.
- `FIXTURE_APP_PORT=4197 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/mcp-tool-labels.spec.ts tests/fixtures/workflow-ux.spec.ts`:
  26 passed with production-shaped snapshots after that correction. Desktop
  (1440px) and mobile (390px) screenshots were visually checked.
- `git diff --check`: passed.

The first sandbox validation needed its localhost checks rerun outside the
sandbox after `listen EPERM`. A later shared-checkout gate passed 1,208 tests
but failed file-size checks in concurrently edited `chatSubmit.ts`,
`controlPlaneApi.ts`, and `controlPlaneApi.test.ts`. These unrelated changes
were excluded from the successful isolated validation and left untouched.

Local evidence is in `tmp/readable-mcp-tool-labels/`. Contract documentation
records the existing response shapes and display behavior. This work is included
in the user-requested main publication tracked by
[Console control simplification](console-control-simplification.md), which
records fresh combined validation. Full release/browser-matrix qualification and
deployment were not requested or performed. Legacy records without canonical
metadata still display their exact stored identity; no alias is guessed from
truncated text.
