# Automation Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Management Console Automation surface with grouped sidebar IA, a new Agents page, workflow agent-assignment review, and consumer contract documentation.

**Architecture:** Add a workspace-scoped Agents route parallel to the existing Workflows route. Keep page data normalized behind `src/services/control-plane/agentApi.ts` and local fallback model files. Reshape Workflows around assigned agents and narrowed effective capabilities while preserving the existing launch/run mechanics.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind utility classes, Vitest, existing AcornOps common components and i18n.

---

### Task 1: Route and Navigation Contract

**Files:**
- Modify: `src/utils/routes.ts`
- Modify: `src/app/appRouteState.ts`
- Modify: `src/app/AppPageContent.tsx`
- Modify: `src/app/AppDesktopSidebar.tsx`
- Modify: `src/app/AppMobileNavigation.tsx`
- Modify: `src/i18n/locales/en.js`
- Modify: `src/i18n/locales/zh.js`
- Test: `src/utils/routes.test.ts`
- Test: `src/app/AppDesktopSidebar.test.ts`
- Test: `src/app/AppMobileNavigation.test.ts`

- [ ] Add a failing route test proving `/workspaces/team-alpha/agents` parses as `{ kind: 'workspaceAgents', workspaceId: 'team-alpha' }` and `AppPaths.workspaceAgents('team-alpha')` returns `/workspaces/team-alpha/agents`.
- [ ] Run `npm run test -- src/utils/routes.test.ts`; expect failure because `workspaceAgents` is missing.
- [ ] Add `workspaceAgents` to route parsing, path helpers, active resource state, lazy page routing, and desktop/mobile nav.
- [ ] Add sidebar labels `Inventory`, `Automation`, and `Agents`, preserving `Administration`.
- [ ] Run `npm run test -- src/utils/routes.test.ts src/app/AppDesktopSidebar.test.ts src/app/AppMobileNavigation.test.ts`; expect pass.

### Task 2: Agent Consumer Model and Fallback Data

**Files:**
- Create: `src/services/control-plane/agentApi.ts`
- Create: `src/pages/agents/agentModel.ts`
- Test: `src/services/control-plane/agentApi.test.ts`
- Test: `src/pages/WorkspaceAgentsPage.test.ts`

- [ ] Add failing tests for `listWorkspaceAgents`, `createAgent`, `updateAgent`, and fallback capability summaries.
- [ ] Run `npm run test -- src/services/control-plane/agentApi.test.ts src/pages/WorkspaceAgentsPage.test.ts`; expect failure because files are missing.
- [ ] Implement consumer types and request helpers for intended Agent routes: `GET/POST /api/v1/workspaces/{workspaceId}/agents`, `GET/PATCH /api/v1/agents/{agentId}`.
- [ ] Implement fallback agents matching `info.md`: internal Kubernetes Diagnostics, external Repository Operator, internal Incident Reporter.
- [ ] Run the focused tests; expect pass.

### Task 3: Agents Page

**Files:**
- Create: `src/pages/WorkspaceAgentsPage.tsx`
- Modify: `src/app/AppPageContent.tsx`
- Test: `src/pages/WorkspaceAgentsPage.test.ts`

- [ ] Add failing integration tests that assert the page contains `Agent library`, `Capability summary`, `MCP servers`, `Target scope`, `Approval defaults`, `Workflows using this agent`, and fallback-warning copy.
- [ ] Run `npm run test -- src/pages/WorkspaceAgentsPage.test.ts`; expect failure.
- [ ] Build the page using a library/detail layout, inline create panel, editable draft fields, permission-limited controls, empty/error/fallback states, and AcornOps button hierarchy.
- [ ] Run the focused page test; expect pass.

### Task 4: Workflow Agent Assignment IA

**Files:**
- Modify: `src/pages/workflows/workflowModel.ts`
- Modify: `src/pages/workflows/workflowPageHelpers.tsx`
- Modify: `src/pages/WorkspaceWorkflowsPage.tsx`
- Test: `src/pages/WorkspaceWorkflowsPage.test.ts`

- [ ] Add failing tests that workflow tabs are `Overview`, `Agents`, `Targets`, `Capability review`, `Runs`, `Settings`, and that workflow copy does not present workflows as owning MCP/tool/skill wiring directly.
- [ ] Run `npm run test -- src/pages/WorkspaceWorkflowsPage.test.ts`; expect failure.
- [ ] Add primary/supporting agent fields to workflow fallback data, show assigned agents, targets/context, effective capability review, disabled capability gates, approval-required actions, and run trace/control-message framing.
- [ ] Keep orange filled button usage limited to workflow launch/activation.
- [ ] Run the focused workflow test; expect pass.

### Task 5: Consumer Contract Docs

**Files:**
- Modify: `docs/contracts/README.md`
- Modify: `docs/contracts/manifest.json`

- [ ] Add consumer contract documentation for planned Agent routes and payload shape, marked as management-console intended consumer boundary pending control-plane producer implementation.
- [ ] Add manifest entries for planned Agent paths and workflow-agent assignment expectations.
- [ ] Run `npm run contracts:check`; expect pass.

### Task 6: Validation

**Files:**
- No new files.

- [ ] Run `npm run lint`; expect pass.
- [ ] Run `npm run test`; expect pass.
- [ ] Run `npm run contracts:check`; expect pass.
- [ ] Run `npm run build`; expect pass.
- [ ] If time allows, run `npm run validate`; expect pass.
