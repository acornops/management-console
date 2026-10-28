# Mobile Navigation and Chat Polish

## Scope

Apply the approved mobile-only alignment and chat input fixes. Desktop begins
at 1200 CSS pixels and must retain its existing appearance. Keep shared button
defaults, typography tokens, viewport metadata, routes, and chat behavior intact.

## Steps

- [x] Reproduce uneven destination alignment and the 14px mobile composer with
  focused fixture tests that measure layout and computed font size.
- [x] Add explicit start alignment to contextual destination buttons in
  `src/app/AppMobileNavigation.tsx`.
- [x] Add a composer-specific class in `TargetChatComposer.tsx` and a font-size
  rule in `src/styles.css`, active only below 1200px and at least 16px.
- [x] Check VM, cluster, and Agent routes, quick chat, phone portrait/landscape,
  and both sides of the 1200px breakpoint. Run `npm run validate`.

## Validation — 2026-10-28

- `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/mobile-navigation-chat.spec.ts --grep 'VM: mobile destination'`:
  failed before the fix, measuring an icon inset near 90px instead of 12px.
- `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/mobile-navigation-chat.spec.ts --grep 'VM:' --max-failures=2`:
  confirmed the original mobile composer was 14px rather than 16px. The initial
  navigation locator was corrected to allow Overview's issue-count badge.
- `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/mobile-navigation-chat.spec.ts
  tests/fixtures/responsive-navigation.spec.ts`: passed, 14 tests. Mobile
  destination geometry and composer sizing pass at phone portrait, landscape,
  1199px, 1200px, and 1440px. Desktop input sizing remains 14px, and existing
  desktop navigation checks pass.
- `npm run validate`: passed, including 232 test files / 1190 tests, UI package
  checks, design checks, type checking, membership/contracts/harness checks,
  production build, bundle budget, and route smoke checks.
- `git diff --check`: passed.
- Independent read-only review: no findings; confirmed desktop isolation.
- Full browser matrix skipped: this is a localized change with focused mobile
  and desktop coverage, not a release-readiness run.

## Follow-up: Compact Mobile Composer

User requested a single row containing Attach, tools/model options, and Send,
with long model labels truncated, plus a two-line maximum for full-page chat
titles. Quick-chat titles already truncate to one line. Keep every new style
below 1200px, including menu positioning needed by the narrower options bar.
At enlarged text sizes, allow wrapping when required to keep controls reachable.

- [x] Verify row geometry, long labels, menu containment, and title height on
  narrow phones; preserve desktop layout at 1200px and above.
- [x] Apply scoped layout and title-clamping rules without changing shared UI.
- [x] Run focused browser checks and the repository validation gate.

### Follow-up Evidence

- The new compact-composer checks first failed because model/tools and action
  buttons were 52px apart vertically. They now share one row at 320, 390, 440,
  956, and 1199px, including long model names and quick chat.
- Full-page titles clamp to two lines below 1200px. Desktop titles remain
  unclamped, and desktop composers retain their existing layout and 14px input.
- Model menus remain inside 320px portrait and 956px landscape viewports;
  keyboard dismissal and quick-chat capability menus remain usable.
- Independent review identified overlap at 200% root font size that the surface
  overflow check missed. A direct button-bounds/non-overlap test reproduced it.
  Keeping flex wrapping available and reserving scalable control widths fixed
  the issue; the regression passes without changing the normal one-row layout.
- `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/mobile-navigation-chat.spec.ts --grep
  'mobile composer stays|mobile quick-chat controls'`: passed, 2 tests after
  the enlarged-text fix.
- `npm run validate`: passed, 232 test files / 1190 tests and all build,
  design, type, contract, harness, bundle, and route smoke gates. An earlier run
  exposed a static source-string assertion; it now checks the preserved desktop
  positioning classes independently of the added mobile class hook.
- `npx playwright test --config=playwright.fixtures.config.ts
  tests/fixtures/mobile-navigation-chat.spec.ts
  tests/fixtures/responsive-navigation.spec.ts
  tests/fixtures/ui-polish-accessibility.spec.ts`: final run passed, 47 tests,
  including desktop navigation, full/quick assistant menus, and light/dark
  capability previews.
- Saved and visually inspected the 440px long-title/long-model test screenshot
  at `test-results/fixtures/mobile-navigation-chat-mob-6d225--names-and-a-two-line-title/mobile-chat-compact.png`.
- Final `git diff --check`: passed. No desktop styling rules or shared UI
  defaults changed.

## Delivery

The user subsequently authorized validation, commit/push to main, a new console
release, and deployment to demo. Source qualification is complete for release
`v0.0.1-experimental.44`; publication and live rollout are tracked by demo-infra's
mobile console release plan. Documentation impact is this implementation and
validation record; routes, public APIs, and shared design tokens are unchanged.

## Release qualification — 2026-10-28

- Independent final review approved the mobile scope and enlarged-text fix.
- `node /tmp/acornops-mobile-release-Vy1QLC/compare-desktop.mjs`: passed 96
  before/after comparisons against unchanged `e59f783` at 1200, 1440, and 1600px,
  light/dark, VM/cluster/Agent/quick chat, and closed/model/submenu/capabilities
  states. Every visible element's computed styles and geometry matched exactly.
  Screenshots matched within a 0.01% low-channel-difference tolerance for GPU
  antialiasing on rounded button edges; no element was masked.
- Production stylesheet AST comparison against deployed `.43`: every existing
  top-level rule and its order is unchanged. Exactly two media blocks were added,
  both excluding widths at or above 1200px.
- Linux Playwright refreshed the six affected chat routes in light and dark
  mobile views (12 images). No desktop or constrained-sidebar baseline changed.
  Representative VM, Agent, and cluster images were visually inspected.
- The first local full-gate attempt encountered sandbox port restrictions; the
  permitted macOS run passed non-browser and component checks but could not use
  the repository's Linux-only route baselines. Those generated macOS images were
  moved out of the repository. Qualification continues in an isolated Linux
  Playwright container with the same source diff and fixture spec.
- Extra WebKit coverage exposed a navigation-test race: opening the drawer before
  the global cluster link's existing workspace redirect completed could close
  the drawer during measurement. The test now waits for the resolved workspace
  URL and editable composer. No application navigation behavior changed.
- `FIXTURE_APP_PORT=4199 npx playwright test
  --config=playwright.fixtures.config.ts --browser=webkit
  tests/fixtures/mobile-navigation-chat.spec.ts` in Linux: all 9 tests passed
  after the readiness correction, including mobile menus, enlarged text, and
  desktop font preservation.
- `DOCKER_CONFIG=/tmp/acornops-mobile-release-Vy1QLC/docker-anonymous
  DOCKER_HOST=unix:///Users/tjtanjin/.docker/run/docker.sock npm run smoke:nginx`:
  passed using the production Node 22 build and nginx image. Root/deep-link
  routing, gzip, security headers, immutable assets, and no-cache HTML passed.
  Anonymous public-image access avoided a stalled desktop credential helper;
  saved Docker credentials were not changed.
- `docker run --rm --name acornops-mobile-release-validation --ipc=host
  -v /tmp/acornops-mobile-release-Vy1QLC/candidate:/work -w /work
  mcr.microsoft.com/playwright:v1.61.1-noble bash -lc
  'git config --global --add safe.directory /work && npm run validate:full'`:
  passed after a clean Linux `npm ci`. Results: 232 unit files / 1190 tests;
  27 component browser tests; all 59 canonical routes in five viewport/theme
  configurations plus forced-colors coverage (51 route-suite tests); 308 fixture
  tests; and 24 MCP parity tests. The one existing mobile logout-transition test
  is intentionally skipped because that case exercises desktop account navigation.
- All 18 source, fixture, and mobile baseline files were byte-compared against
  the Linux validation copy and matched. Final `git diff --check` passed.

## Evidence Limits

Fixture tests can verify mobile geometry and the desktop font size, but cannot
reproduce the real iPhone software keyboard or prove native Safari focus zoom
is gone. The final device check remains on the user's iPhone.
