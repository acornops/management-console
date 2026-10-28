# Console control simplification

Follow-up authorized 2026-10-29: add localized `POD_LOGS_UNAVAILABLE` copy for
containers waiting to start, coordinated with AgentK and Control Plane on
`fix/console-log-polish`. Verify and publish this chat's changes to main using
isolated worktrees, excluding the other chat's graceful-restart work.

User-requested follow-up, 2026-10-29. Keep the existing console style and limit
changes to log controls, Agent owner search, and MCP tool discovery controls.

- [x] Use a compact Search logs row with accessible Copy/Download icon actions.
  Keep search and exports limited to loaded output and preserve failure feedback.
- [x] Remove the separate Agent owner search and its query state. Retain the
  owner selector, permission checks, and paginated access to later members.
- [x] Remove MCP capability/configured-state filters and Saved effective copy.
  Preserve search across all pages, unsaved edits, and complete-group switches.
- [x] Update affected existing tests and operational documentation.
- [x] Run affected browser suites, inspect desktop/mobile views, and validate.
- [x] Record the separate read-only demo log investigation and its findings.

The user also requested diagnosis of the demo log error. Trace the actual
request and agent response before proposing a runtime fix; this UI change does
not authorize a deployment. Existing MCP label changes remain part of this chat.

## Earlier local validation

The initial implementation was verified in the shared checkout before publication.
Node 22.23.1 was selected explicitly. Commands from the console repository:

- `VITE_APP_DATA_MODE=control-plane npm run validate`: UI/design, typecheck,
  234 files / 1,224 unit tests, contracts, harness, build and bundle checks passed.
  The final route check could not bind localhost under the sandbox (`EPERM`).
- `npm run smoke:routes`: passed with loopback permission, completing that gate.
- `FIXTURE_APP_PORT=4195 FIXTURE_REUSE_SERVER=1 npm run smoke:fixtures -- tests/fixtures/log-investigation.spec.ts tests/fixtures/mcp-tool-list-usability.spec.ts tests/fixtures/workspace-agents-accessibility.spec.ts`:
  66 passed. Covers clipboard/download, errors, long tool lists, drafts, complete
  group operations, member pagination, permissions, mobile, themes and locales.
- `npm test -- src/i18n/resources.test.ts src/i18n/copyConsistency.test.ts src/features/targets/admin/McpServerToolsDialog.test.tsx`:
  passed after correcting the Chinese MCP empty-state wording during review.
- `git diff --check`: passed.

Independent scoped review found one Chinese string changed in the wrong
namespace; corrected without changing built-in tool filters. Browser inspection
confirmed the icon row at desktop and 390px widths, and MCP search without the
removed controls. Screenshots: `/tmp/acornops-console-controls/`.
Full release browser matrix was not run for this localized change. No release,
deployment, runtime contract, dependency, or shared UI package change.

## Demo log diagnosis

Read-only live checks through the existing Control Plane-to-agent connections
returned 1,364 bytes from a running Kubernetes pod and 200 VM log entries with
collector status `ok`. VM log reads use the on-demand `query_logs` tool; the
console's loaded output is bounded and is not a continuously followed stream.

The failing demo pod is intentionally in ImagePullBackOff, has zero restarts,
and its container has never started. Kubernetes returns HTTP 400 explaining
that condition. AgentK `get-resource-logs.ts` discards the upstream error body
and throws a plain Error; the executor and Control Plane reduce it to
`AGENT_TOOL_ERROR`, which the console presents as a generic agent failure.
The approved follow-up preserves a safe container-not-started classification and
displays that no logs are available yet. The diagnosis itself made no backend
changes or live mutations.

Evidence: demo SSH helper, pod state/RBAC and bounded agent logs, target-workspace
scoped READ ONLY audit queries, and existing `agentGateway.callAgentTool` reads.
No paid model calls or credential output. Automatic approval review rejected
browser submission of seeded demo-owner credentials as unauthorized; no alternate
sign-in was attempted. A broad initial audit query was narrowed to the known
demo target's workspace and then approved. Live browser sign-in was not verified;
the successful live evidence is from the read-only service paths above.

## Main publication verification — 2026-10-29

The complete chat patch was transferred to a clean worktree based on
`origin/main` (`3f36b7501698dd8ae4a6bfe2c8517def3e770c5b`) on
`fix/console-log-polish`. Other in-progress graceful-restart work was excluded.
The user explicitly requested a direct main commit and push; no PR or deployment
is part of this handoff. The readable-MCP-label work is included in this patch.

The additional log-message fix consumes `POD_LOGS_UNAVAILABLE` (409), localizes
the explanation in English and Chinese, and keeps Refresh available after
startup. Its formatter regression failed before implementation and passed after.
The coordinated AgentK and Control Plane changes classify only a Kubernetes
waiting-container HTTP 400 and return constant sanitized copy.

Fresh checks with Node 22.23.1:

- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed; 232 files / 1,198
  unit tests, UI/design checks, types, contracts, harness, build, budget and
  route smoke. Localhost checks ran with the required sandbox permission.
- `FIXTURE_APP_PORT=4196 npm run smoke:fixtures -- tests/fixtures/log-investigation.spec.ts tests/fixtures/mcp-tool-list-usability.spec.ts tests/fixtures/workspace-agents-accessibility.spec.ts tests/fixtures/mcp-tool-labels.spec.ts tests/fixtures/approval-review.spec.ts`: 98 passed, including startup-error recovery,
  exports, canonical tool names, approval identity, owner pagination, MCP search
  and draft handling, mobile, themes and locales.
- Workspace `node scripts/harness/check-platform-contracts.mjs`: passed against
  these worktree manifests and unchanged counterpart `origin/main` manifests.
- Independent read-only review: no actionable findings.
- `git diff --check`: passed.

Logs are in `/tmp/acornops-console-publish/`. Full release browser-matrix
qualification was not run for these localized controls. Existing screenshots
remain in the original checkout's `tmp/console-control-simplification/`. The new
message requires updated AgentK, Control Plane and console releases; this source
publication does not change the running demo. Legacy MCP records without
canonical metadata retain their stored identity.
