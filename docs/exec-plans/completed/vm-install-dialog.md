# VM Install Dialog Implementation Plan

**Status:** Completed on 2026-10-25. Management Console `.38` is released and running in the demo. This record covers the focused UI change and its rollout, not a new certification of real-VM AgentV execution.

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resume installation of an existing VM from a focused dialog, matching the Kubernetes catalog interaction without changing either agent's credential contracts.

**Architecture:** A VM-only dialog owns its short-lived enrollment command and uses the existing typed control-plane client. The catalog and VM Settings open that same component; initial onboarding shares its command panel. Repair, replacement credentials and host-policy updates stay in Settings.

**Tech Stack:** React, TypeScript, existing `@acornops/ui` dialog controls, Vitest, Playwright, existing GitHub image release and demo Ansible/Helm workflows.

**Spec:** The approved design below. The user approved this approach and authorized implementation, release and non-destructive demo redeployment on 2026-10-25. Execute inline in the existing checkouts on `fix/vm-install-dialog`, matching their earlier checkout preference.

## Approved design and alternatives

- Selected: VM **Install Agent** opens a dedicated dialog, like Kubernetes. It uses the existing VM ID and configured access policy. Opening does not register a VM, mint enrollment or replace a credential.
- Alternative: send both target kinds to Settings. Rejected because it changes the established Kubernetes interaction and makes installation recovery less direct.
- VM Settings' **Finish AgentV setup** action opens the same dialog; existing Settings URLs remain valid.
- Keep one explicit command-generation action, copy feedback, expiry/regeneration, warnings, errors and connection verification. Closing returns to the originating control and preserves catalog filters and position.
- Keep existing visual tokens, dialog shell and mobile scrolling. No new design system, generic target installer framework, backend API, dependency or AgentV release.

## Target boundary

| Concept | Shared | Kubernetes-specific | VM-specific |
| --- | --- | --- | --- |
| Dialog shell, focus and scroll | Existing UI primitives | Existing modal unchanged | Use the same interaction pattern |
| Enrollment | No shared credential implementation | AgentK key rotation unchanged | Existing `purpose: initial` endpoint and 15-minute command |
| Access policy | Server-authorized capability | Kubernetes RBAC unchanged | Preserve configured access and exact service allowlist |
| Repair/replacement | Explicit lifecycle operations | Unchanged | Remain separate Settings actions |

## Global constraints

- Use `manage_targets` for initial VM setup, matching the existing control-plane enrollment authorization. Keep `manage_agent_keys` for replacement credentials.
- No secrets in URL, browser storage, logs or screenshots from a real enrollment.
- Do not change Kubernetes production code, AgentV, control-plane contracts, shared UI package or unrelated styles.
- Keep source files below the repository's 650-line budget.
- Release the Management Console through its existing tag/image pipeline. Preserve the demo's AgentV `.8` pin and all other component/chart versions.
- No demo teardown, database migration, secret rotation, user-VM mutation or paid-model requests.

## Review focus

1. Closing, switching VM/workspace or navigating while generation is pending must not resurrect a dialog or expose a stale command.
2. Users with target-management permission but no key-management permission can finish setup; viewers cannot open or generate setup commands.
3. Expired commands cannot be copied; retry/regeneration remains explicit and cannot create another target or replace credentials.
4. A connected target cannot receive another initial enrollment through the dialog; connection checks are reads, not installation claims.
5. Mobile/keyboard closing, focus restoration and catalog context work without changing Settings repair/replacement behavior.

## Task 1: Implement and validate the scoped VM flow

**Files:**
- Create `src/pages/virtual-machines/VirtualMachineAgentInstallModal.tsx` and `AgentVInstallCommandPanel.tsx`.
- Modify `VirtualMachinesListView.tsx`, `VirtualMachineSettingsView.tsx`, `AddVirtualMachineModal.tsx`, `useVirtualMachineAgentSetup.ts`, and their orchestration in `src/pages/VirtualMachinesPage.tsx`.
- Modify `src/i18n/locales/en.js`, `zh.js`, and `docs/contracts/README.md` only for the affected UI copy/behavior.
- Update `tests/fixtures/agentv-onboarding.spec.ts`; add focused `tests/fixtures/vm-install-dialog.spec.ts` coverage.

**Interfaces:**
- Modal consumes `workspaceId`, `workspaceName`, `vm`, `onVirtualMachineUpdated(vm)` and `onClose()`; owns transient command, busy and error state. It calls `createVirtualMachineAgentEnrollment(workspaceId, vm.id, 'initial')` only on an explicit Generate action and `getVirtualMachine(workspaceId, vm.id)` to check connection.
- Command panel consumes typed install instructions and optional expiry-regeneration callback; reuses `useAgentVInstallCommand` without changing API payloads.
- Catalog and Settings own dialog visibility. Key route-level views by workspace/target identity so navigation cannot retain another target's dialog state.

- [x] Verify the clean baseline with `npm run test`.
- [x] RED: change the existing onboarding test to require an Install Agent dialog on the unchanged catalog URL; run that one test and observe the Settings-navigation failure.
- [x] GREEN: implement the dialog, shared command panel and both entry points. Delete the now-unused inline initial-enrollment handler/props; preserve maintenance handlers.
- [x] Add tests for explicit API calls and existing target identity, generation errors/retry, expiry/copy, repeated clicks, late responses after closing/reopening, target-management-only and viewer permissions, connection completion, Settings entry and unchanged repair/replacement.
- [x] Run `npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/agentv-onboarding.spec.ts tests/fixtures/vm-install-dialog.spec.ts tests/fixtures/cluster-onboarding-progressive-disclosure.spec.ts tests/fixtures/target-catalog-card-clarity.spec.ts` on an unused port. All tests must pass.
- [x] Inspect the local fixture flow through the browser tool on desktop and mobile. Run accessibility assertions for the new modal in both themes, with only synthetic fixture commands.
- [x] Run `VITE_APP_DATA_MODE=control-plane npm run validate`, `npm run test:coverage`, and `git diff --check`; all must pass. Full hosted CI runs the unchanged Linux snapshot and browser suites before publishing.
- [x] Review the complete diff independently using the requesting-code-review skill; address important findings with RED/GREEN regression tests.
- [x] Commit focused implementation, tests and docs with `fix(console): resume VM installation in a focused dialog`.

## Task 2: Publish and apply the console update

**Files:** Demo `ansible/group_vars/demo/platform.yml`, `ansible/roles/acornops_platform/defaults/main.yml`, `docs/demo-vm-onboarding.md`, `README.md` release-pin references, and its rollout record.

**Interfaces:** Task 1 supplies the reviewed Management Console source commit. The existing release workflow produces `ghcr.io/acornops/management-console:0.0.1-experimental.38`; use that pin only after successful CI/publication and image inspection.

- [x] Fast-forward local `main`, push, and require hosted CI success. Confirm `.38` is unused before creating/pushing its immutable tag. No tag rewrites or bypassed release gates.
- [x] Require the release workflow's Node 22 preflight and full browser gates; verify the published OCI digest/source. Package.json remains at its established private app version because image versions are tag-driven.
- [x] Update only the demo Management Console image override/default to `.38` and document resuming an existing VM. Run `task validate` with Ansible available and render the chart values to confirm other pins are unchanged.
- [x] Merge/push demo `main` after the image exists; follow the existing push-triggered lease-protected deployment, without a duplicate manual dispatch.
- [x] Verify live image/digest, ready deployments, public routes, unchanged storage identities and AgentV `.8` installer pin. Use the browser for a read-only demo check if its authenticated session is available; do not generate a real enrollment merely to inspect the modal.
- [x] Archive both execution records with commands/results and remaining limitations. Confirm both local/remote main branches are clean and aligned; preserve the workspace's pre-existing untracked `tmp/`.

## Evidence

Initial source: Management Console `78b1302`; demo infra `ffbad05`. Both matched remote `main`. Latest Management Console tag was `.37`. The control-plane enrollment handler explicitly checks `manage_targets` for `initial` and `manage_agent_keys` for `replace`.

- Baseline and coverage: 232 test files, 1,187 tests passed. Coverage thresholds passed.
- Focused browser suite: 20 tests passed using `FIXTURE_APP_PORT=4297`, including four viewport/theme accessibility checks with zero axe violations. Regression tests first exposed the original navigation mismatch, focus loss during generation, inaccessible command scrolling, and missing focus fallback when connection removes a filtered card; the final run passes each case.
- Browser-tool check: existing-VM dialog stays on the catalog URL, generation is explicit, 375px content scrolls independently of its footer, and Escape restores focus to the initiating card control. Only synthetic fixture commands were generated.
- Kubernetes production code, backend APIs, dependencies and the AgentV release are unchanged.
- Independent review found two important edge cases: initial onboarding must keep the expiry clock active while a command remains visible after connection, and Settings needs a stable focus fallback when successful setup removes its initiating button. Both were reproduced with failing browser tests and fixed in the single review pass; the full focused suite passed afterward. No critical or minor findings remained. Hosted release and live demo checks are separate gates below, not waived by the source review.
- Consolidated source commit `c02dde80a5b40e7bbdacd4b17411b029b496e891` passed [hosted CI](https://github.com/acornops/management-console/actions/runs/40126974169), including Node 22 preflight, snapshots, all responsive route projects, fixtures and MCP parity. The previously unused `v0.0.1-experimental.38` tag points to this exact commit.
- [Image release](https://github.com/acornops/management-console/actions/runs/40128046502) passed its full validation gate and published `.38`. Its OCI index is `sha256:a68cbae7b39543f509194db5b189c176f9ca951791f360d5cec7cf69979c29f8`; Linux/amd64 manifest is `sha256:b4ad18b80ef834f0353110da2b4953daf0ffdd66479baf17d01af8bb9052d7c4`. Build provenance verifies the exact reviewed source SHA, repository and release workflow.
- Demo `task validate` passed with Ansible available. A localhost-only render of the real chart-values template passed assertions for console `.38`, unchanged companion images, chart `.24` and AgentV `.8` (first RED against `.37`, then GREEN after the pin change). The demo README now links to authoritative configuration instead of duplicating stale release versions.
- Demo rollout source `ab68b6f28b6a234025221a6bd32ec9ae38d5076d` passed [infrastructure CI](https://github.com/acornops/demo-infra/actions/runs/40129865105) and triggered the existing [deployment workflow](https://github.com/acornops/demo-infra/actions/runs/40129865002). No manual duplicate dispatch or reset was used.
- The deployment workflow succeeded. `task demo:verify DEMO_ENV_FILE=.env.demo` passed live host/Kubernetes checks and public console, API, identity and platform-admin readiness checks. All five application deployments were ready (1/1). The running console's image ID matched the published `.38` OCI index digest above. Helm release revision advanced from 2 to 3 with chart `.24`; backend image pins and AgentV `.8` stayed unchanged.
- Application Postgres, Redis and identity Postgres retained their exact pre-rollout PVC UIDs, recorded in the demo rollout archive. No teardown, credential generation, user-VM change or paid-model request was performed.

## Verification boundary

The independent source review did not qualify hosted builds or deployment; those were retained as separate mandatory gates and have now passed. Its two important findings were fixed with failing-then-passing regression tests. No minor findings were deferred.

The browser tool verified the dialog locally with synthetic fixtures. The demo browser had no authenticated Management Console session; starting its OIDC flow required explicit approval, which was requested and remained pending during this run. Therefore authenticated demo interaction and execution of a command on a real VM are not claimed. Live deployment acceptance used image provenance/digest, readiness, public endpoints and storage identity checks. Refresh the demo, then use **Install Agent → Generate setup command** on an existing unconnected VM to try the new dialog.
