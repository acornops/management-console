# Webhooks Hub

## Goal

Turn the workspace Webhooks destination into a direction-aware operational hub
without duplicating webhook ownership or breaking the existing outbound route.

## Decisions

- The sidebar and route title use **Webhooks**.
- The hub exposes URL-backed **Outbound** and **Inbound** tabs, in that order.
- `/workspaces/:workspaceId/webhooks` defaults to Outbound for compatibility;
  `?direction=inbound` selects Inbound.
- Inbound aggregates every workflow-owned webhook in the workspace. Rows link
  to the owning workflow's **Inbound Webhooks** tab for configuration.
- Outbound remains workspace-owned and retains its existing editor, signing
  secret handling, delivery history, and `manage_webhooks` permission gates.
- The compatibility `/workflows/incoming-webhooks` route remains available.
- User-facing directional terminology uses the matched pair Inbound / Outbound.

## Verification

- Focused navigation, route, and webhook source-contract tests: 36 passed in
  the final rerun; the earlier workflow-section-inclusive run passed 45 tests.
- Focused fixture browser coverage: 4 passed, covering the inbound aggregate
  deep link, existing outbound history and one-time secret flows, compact
  navigation, and short desktop sidebar geometry.
- `npm run lint`: passed.
- `npm run design:check`: passed across 456 source files.
- Membership, contract, and harness checks: passed.
- Production build and bundle budget: passed; the largest JavaScript chunk was
  312,686 bytes, within the enforced 350 KiB raw limit.
- Route smoke checks: passed when rerun with localhost server permission.
- `npm run validate` stopped at a pre-existing design-adoption violation in
  `src/pages/WorkflowSettingsPanel.tsx:64`, outside this change.
- The full Vitest run passed 904 of 906 tests. The two failures were unrelated
  stale source assertions in `WorkspaceWorkflowSections.test.ts` and
  `TraceFooter.polish.test.ts`; the focused webhook suites remained green.

## Completion Criteria

- The Webhooks navigation destination opens the outbound-compatible hub route.
- Each direction is keyboard reachable and survives reload or history travel.
- Inbound filters across all workflow webhook records and links each row to its
  owning workflow rather than opening a second editor.
- Outbound behavior and one-time secret handling remain intact.
- Documentation and English and Chinese labels use consistent direction terms.

## Result

Completed. The workspace route is now a direction-aware Webhooks hub. Inbound
records remain workflow-owned and link to their canonical workflow editor;
outbound management and the existing `/webhooks` default behavior are preserved.
