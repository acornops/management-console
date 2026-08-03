# Agent Permission Settings

## Goal

Make an Agent's effective run-permission mode configurable from the Agent
Settings route and remove the redundant policy banner from Agent chat.

## Constraints

- Keep `permissionMode` as the authoritative user-facing policy field.
- Preserve the control plane's existing permission-mode contract and RBAC
  enforcement; this is a management-console change only.
- Preserve unrelated in-progress management-console changes.
- Continue to default newly created Agents to `ask_before_changes`.
- Do not weaken per-tool, target, workspace-role, or destructive-action gates.

## UX acceptance criteria

- Agent Settings shows a labeled selector with the three supported modes:
  Read only, Ask before changes, and Auto-run allowed changes.
- Each selection explains its operational effect before save.
- Only users with `manage_agents` can change and save the mode.
- Saving updates the live Agent definition and reports success or failure.
- Agent chat no longer renders the policy banner or its Pause changes action.
- Existing prompt and composer safety copy continues to describe the effective
  permissions where relevant.
- If an Agent becomes read-only while an older conversation is still marked
  read-write, chat narrows that conversation to read-only and continues without
  exposing the expected control-plane policy conflict as a system error.

## Validation log

- `npm run app:typecheck` passed.
- `npm run design:check` passed across 447 source files.
- Focused Agent settings/chat/localization Playwright checks passed: 3 tests.
- Affected `agent-chat` and `agent-settings` design-route snapshots passed in
  desktop light/dark, mobile light/dark, and sidebar-constrained projects.
- The first full Agent accessibility-spec run passed 20 of 25 tests. One failure
  was its stale localized banner assertion; that directly affected assertion was
  updated and passed on rerun. The other four failures are unrelated assertions
  from in-progress Agent detail work: two expect the retired `Agent chat` route
  heading and two expect retired tool-inventory headings. The permission
  selector, banner-removal, and updated localized chat checks all passed.
- `npm run validate` passed UI package checks, design checks, application
  typechecking, all 199 Vitest files (977 tests), membership checks, and contract
  checks. It stopped at pre-existing harness line budgets in `src/App.tsx`,
  `src/pages/VirtualMachinesPage.tsx`, and `src/styles.test.ts`; none are touched
  by this change.
- The validation stages after the harness check were run separately: production
  build, bundle budget, and route smoke checks all passed.

## Follow-up: stale conversation access

- Reopened after a live read-write conversation produced the expected
  `AGENT_CONVERSATION_POLICY_READ_ONLY` conflict after its Agent was changed to
  read-only.
- The UI must treat this as a recoverable state synchronization event, preserve
  the narrowed policy, and retry the requested read-only run once.
- Implemented automatic narrowing through the existing conversation-access API.
  The send path proactively synchronizes known stale state and also recovers once
  from the stable `AGENT_CONVERSATION_POLICY_READ_ONLY` conflict for policy
  changes that race with the client refresh. The same client request ID is reused
  for the retry.
- Added fixture enforcement for the production conflict and a browser regression
  that changes an Agent to read-only, resumes its existing read-write
  conversation, and verifies a successful message with no raw control-plane
  error.
- Follow-up validation passed: application typecheck; design-system check across
  451 files; 13 focused unit tests; 4 affected Agent browser tests; and the full
  `npm run validate` entrypoint, including 199 Vitest files (977 tests), harness,
  production build, bundle budget, and route smoke checks.

## Completion criteria

- Focused Agent settings and chat tests pass.
- TypeScript, lint, design-system checks, and the repository validation
  entrypoint pass, or any unrelated failures are documented with evidence.
- End-user documentation needs no change because the current tools and MCP
  guide already documents all three Agent permission modes.
