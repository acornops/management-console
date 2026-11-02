# Console bug reports and public VM documentation

## Scope and evidence

The user requested critical verification and minimal fixes for Chinese translation
gaps, English singular forms, historical trace statuses, VM overview assistant
navigation, and stale public documentation. Work starts from console `ee677e5`
and docs website `23d6fe8`, fetched from upstream before investigation.

- English and Chinese catalog keys match. Static English rendered outside `t()`
  bypasses those catalogs. Translate verified UI copy, preserving technical names,
  code examples, user content, and backend evidence.
- `app.availableWorkspacesDescription` renders `1 workspaces`; audit other count
  phrases and use the existing i18next plural convention.
- `TraceFooter` maps historical informational events to `Progress` and tool events
  to `Function tool · Running`. Events remain history after run completion.
- `VirtualMachinesPage.openVmIssueTriage` navigates to the full chat route. The
  existing `onRunTargetPrompt` launcher already opens a VM assistant dock for the
  selected VM and retains responsive drawer behavior.
- Upstream public docs contain a Windows preview note but still present Linux-only
  onboarding. AgentV upstream explicitly records Windows as unqualified for rollout.

## Fix decisions

Use existing translation resources, event history, and assistant launcher. Avoid
new translation infrastructure, backend state changes, event/result rewriting,
or a second drawer implementation. A finished run does not prove every tool
succeeded; informational events must remain neutral. Windows docs must distinguish
read-only preview support from release qualification and server availability.

## Execution

- [x] Localization: audit untranslated static UI copy and count-bearing messages;
  add focused runtime translation regression cases; apply resource and call-site
  corrections without changing data or business logic.
- [x] Trace: reproduce completed-run labels in a rendered component test; cover
  active, failed, cancelled, partial reasoning, and retained result evidence;
  correct presentation and translate footer UI with the localization work.
- [x] VM overview: add a fixture test proving the issue action retains the overview
  route and opens the existing VM dock with the issue prompt; confirm the test
  fails before passing `onRunTargetPrompt` through `AppPageContent` and removing
  the redundant page-local prompt state. Check desktop and narrow-screen behavior.
  Independent review also reproduced loss of the edited draft on maximize. A
  VM-specific, one-use in-memory handoff retains text; the existing session query
  retains the selected conversation. The regression failed before the fix.
- [x] Docs: compare live content, latest source, and implemented AgentV behavior;
  update only verified stale public VM/setup/security claims. Preserve Linux
  setup and clarify conditional Windows preview availability and limits.
- [x] Review the combined diff for scope, truthful statuses, interpolation parity,
  plural behavior, target/workspace identity, and documentation accuracy.
- [x] Run console `npm run validate`, affected browser fixture tests, and docs
  `npm run check`, `npm run validate`, `npm run links`. Record exact results and
  any environmental limitations before handoff.

## Coordination

The console and docs website use `fix/console-localization-traces-vm-docs`.
They do not change API contracts and can be integrated independently. Existing
untracked files and work in other repositories are outside this task. Publishing
is separate from local implementation and validation.

## Findings and review

All five reports describe real user-visible issues. The localization report's
cause was hardcoded UI copy, not mismatched catalog trees: the original English
and Chinese catalogs each had 3,492 effective keys with no missing literal calls.
The final catalogs each have 4,000 keys. The audit corrected 21 existing count
templates and the obsolete `_plural` namespace form; new trace summaries also
use singular/plural forms. Technical names and arbitrary user/backend evidence
remain unchanged.

Live `/use/connect-vm.md` matched the pre-edit docs source after Mintlify formatting
normalization. This was a source coverage gap, not a stale deployment. Windows
claims were checked against AgentV `b7df481` and control plane `a8f2b0a`.

Independent review found and resolved the VM draft/session handoff, two untranslated
fallback trace titles, and a language-change dependency that could reset workflow
editing. The final review found no remaining actionable defects. Existing cached
error messages may retain their original language until refreshed; this change
does not rewrite historical evidence or persisted operator content.

## Validation evidence

Initial unit/browser/docs checks used Node.js 24.2.0: the machine's `node@22`
symlink also points to that version. Final console validation uses an official
Node.js 22.23.4 binary downloaded into `/private/tmp/acornops-node22-validation`
and verified against Node.js's SHA256 manifest. System tooling was not changed.

- `npm test -- src/features/targets/chat/components/TraceFooter.test.tsx`:
  15 actual-render tests passed, including live/replayed completion, errors,
  cancellation, incomplete reasoning, Chinese copy, and singular counts.
- `npm run smoke:fixtures -- tests/fixtures/vm-overview-assistant.spec.ts tests/fixtures/virtual-machine-overview-audit.spec.ts tests/fixtures/workspace-overview-audit.spec.ts tests/fixtures/workflow-run-responses.spec.ts tests/fixtures/workflow-ux.spec.ts tests/fixtures/workspace-agents-accessibility.spec.ts tests/fixtures/workspace-suspension.spec.ts`:
  all 86 tests passed.
- Docs website `npm run check`: passed for 43 navigation pages.
- Docs website `npm run validate`: Mintlify build validation passed.
- Docs website `npm run links`: no broken links.
- `git diff --check` in both repositories: passed.
- `VITE_APP_DATA_MODE=control-plane npm run validate` under Node.js 22.23.4:
  passed, including 240 test files / 1,327 tests, package/design checks, app
  typecheck, membership/contracts/harness checks, production build, bundle budget
  (56 JavaScript chunks), and route smoke checks.
- Final `npm run smoke:fixtures -- tests/fixtures/vm-overview-assistant.spec.ts`:
  all three cases passed after the callback simplification.

The first console gate passed all 240 test files / 1,327 tests, then stopped at
the VM page's 650-line budget. Removing an obsolete callback wrapper and
normalizing one import restored that budget; `npm run harness:check` passed.
All three VM browser cases passed again after that simplification. A concurrent
browser-server startup and console gate briefly rebuilt the same generated UI
output, interrupting the export check. Final console validation passed by itself
with Node.js 22, avoiding this validation-process race.

The initial sandbox blocked local browser ports and Mintlify's generated cache;
these checks ran with the required environment permissions.
## Final production review

The follow-up request authorizes main integration, release publication, and demo
redeployment after fresh review and release validation. Native Windows
qualification remains outside this change; production rollout stays disabled.

- Preserved the eight existing interpolation contracts used by custom runtime
  locales. Count-of-total summaries select plural forms from the total while
  interpolating the original visible count through i18next `replace`. A rendered
  custom-locale regression failed with leaked placeholders and wrong counts before
  the fix, then passed.
- Prevented VM maximize while initial conversation/prompt preparation is pending.
  A delayed activity-response regression failed before the guard; all four VM
  browser cases now pass, including edited draft and selected-session handoff.
- Reviewed public definitions, architecture, security, API, setup, and navigation
  together. Windows setup describes the exact protected log-channel setting and
  service reload while retaining the read-only, unqualified preview boundary.
- Fresh `VITE_APP_DATA_MODE=control-plane npm run validate:ci:preflight` passed
  under Node.js 22.23.4 as part of the full release wrapper: 240 test files /
  1,328 tests with coverage, type checks, package/design checks, contract/harness
  checks, production build, bundle budget, and route smoke checks.
- The design-system browser suite passed 27 cases with one intentional skip.
  The route snapshot stage cannot compare on this macOS host: this repository
  tracks those baselines only for Linux. The run was stopped and only its newly
  generated, untracked baseline images were removed. Linux CI must pass before
  main integration; existing baselines are not being regenerated for this fix.
- Docs structure, Mintlify validation, and link checks pass after the coherence
  updates. Docs PR #21 also passed CI. Demo pin PR #21 passed CI, including the
  Ansible check unavailable locally.

Final browser, Linux CI, release, and live-deployment results are recorded in the
related PRs and the workspace change-set handoff before completion.
