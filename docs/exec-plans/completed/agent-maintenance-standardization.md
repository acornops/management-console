# Agent maintenance standardization

## Release integration — 2026-10-26

Implementation and independent review are complete. The user subsequently
authorized main integration and a demo release. The original implementation
record below is historical; publication and deployment acceptance are tracked
in the deployment repository's security-maintenance-release plan. Remaining
production gates are not cleared by this source qualification.

Use the same upgrade/repair and credential-replacement choices for installed
Kubernetes and VM targets. Keep native installation and permission rules, with
explicit immediate-revocation wording for Kubernetes replacement.

Branch: `fix/runtime-validation-security`, using the current checkout.

Shared command display retains clipboard failure feedback, keyboard scrolling,
and VM enrollment expiry. No design-system restyling, dependency changes, release,
or deployment. The additive Control Plane endpoint must deploy first.

Validation on 2026-10-26:

- `VITE_APP_DATA_MODE=control-plane npm run validate`: 1,190 tests plus type,
  design-system, contract, harness, bundle, build, and route checks passed.
- Focused Playwright: 28 tests across agent maintenance, AgentV onboarding, VM
  install dialogs, and cluster onboarding passed. Coverage includes narrow-screen
  accessibility and delayed credential-rotation success/failure responses.
- Browser tool inspection confirmed both settings flows and credential timing
  warnings. Initial install remains read-only; installed actions work offline.
- Public docs validation/links and cross-repository contracts passed.

Independent review found a close/reopen race during Kubernetes key generation.
Two regressions failed before the fix and passed afterward. The existing dialog
close guard now blocks Close, X, Escape, and backdrop dismissal while generation
is pending, preventing overlapping rotations through a reopened dialog. Dismissal
is restored on success or failure. The full console and focused browser suites
passed again after this fix. No review findings remain deferred.

Changes remain uncommitted. No real target credentials were rotated, no installer
was run on a host, and no demo or production deployment was changed. Release
still requires a live disposable-cluster maintenance canary.
