# Compact assistant capability preview

Status: implemented and validated locally on 2026-10-27; included in the
coordinated experimental.42 release preparation.

## Scope and design

Restore the pre-October-19 tools/skills list cap of `14rem` (224px at the
default root font size). Preserve the existing popup appearance, portal
placement, viewport fallback, focus restoration, and Escape behavior. This is
the user's requested correction, not a new visual design. The shared component
covers Agent, Kubernetes, and VM assistants in full-page and quick/docked chat.

Use the existing bounded list inside the viewport-bounded popup. Reverting the
portal fix would restore mobile/docked clipping; an arbitrary new overall
height would change the established header/list relationship. Neither is needed.
Make the restored scroll area keyboard-focusable. Do not change colors, fonts,
spacing, widths, animations, API contracts, dependencies, or deployment pins.

## Checks

- [x] Trace the regression to `bad4249` and compare nearby overlay history.
- [x] Extend the existing 200-tool browser matrix to assert compact desktop
  height, the 224px list bound, keyboard scrolling, and stationary header.
- [x] Observe the desktop regression fail before the production change.
- [x] Restore the bounded list with the smallest component edit.
- [x] Pass the extended matrix, existing narrow/short viewport and dismissal
  checks, and `npm run validate`; inspect the result using the browser tool.
- [x] Document exact evidence and final scope review.

## Similar-issue audit

Reviewed October 19 through current `main` for removed height/scroll limits.
The capabilities list is the only confirmed lost cap. The model submenu,
reference picker, target-mention autocomplete, Select, MCP tools dialog, and
trace evidence retain their bounds. Installer command limits were consolidated
into `AgentCommandPanel` with an 18rem scrollable region, not dropped. No
additional presentation changes are justified by this review.

## Validation

Commands run from the Management Console root with Node 22.23.1 on `PATH`:

```sh
FIXTURE_APP_PORT=4193 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/ui-polish-accessibility.spec.ts --grep 'VM full capabilities stay compact.*light'
FIXTURE_APP_PORT=4193 npx playwright test --config=playwright.fixtures.config.ts tests/fixtures/ui-polish-accessibility.spec.ts tests/fixtures/chat-model-availability.spec.ts
VITE_APP_DATA_MODE=control-plane npm run validate
git diff --check
```

- Before the component change, the focused regression failed: the popup was
  884px tall in a 900px viewport. The final focused run passed.
- Final browser run: **45 passed**, including the 12-case capabilities matrix
  (Agent/Kubernetes/VM, full/quick chat, light/dark). Desktop sizes were
  1440×900 and 1920×1080; narrow/short sizes were 320×568, 390×360, and 768×568.
  The matrix checks list bounds, End/Home scrolling, stationary headers,
  wheel access to the footer, viewport containment, and Escape focus return.
- An intermediate wheel test caught a newly added `overscroll-contain` blocking
  the outer short-screen fallback. It was removed; real pointer scrolling now
  reaches the entire footer. Test-only fixes wait for keyboard scrolling to
  finish and reopen the popup across the existing quick-chat responsive remount.
- Final validation passed: 232 files / **1,190 unit tests**, UI package and
  design checks, app types, membership, contracts, harness, production build,
  bundle budget, and route smoke checks. Whitespace checks passed.
- Browser-tool inspection of the local 200-tool fixture measured a **444px
  popup with a 224px scrolling list**. The header and existing appearance remain
  intact. Logs and before/after screenshots are in the local evidence folder
  `/tmp/acornops-compact-capabilities-Yrn2M3`.
- Independent final diff review found no remaining issues. Production code
  changes only one container line; no global CSS, dependencies, contracts, or
  screenshot baselines changed. `docs/RELIABILITY.md` records the scroll invariant.

The original correction was validated against local fixtures. The subsequent
release request includes the hosted browser gate and demo rollout; that evidence
is recorded in the deployment repository's
`docs/exec-plans/completed/approval-resume-release.md` after rollout.
