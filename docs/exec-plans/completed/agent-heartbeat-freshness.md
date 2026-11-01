# Agent heartbeat freshness

Completed 2026-11-02 on `feat/windows-vm-support`. The [coordinated record](../../../../control-plane/docs/exec-plans/completed/agent-heartbeat-freshness.md) contains the design, review fixes, exact validation commands and remaining boundaries.

- [x] Add failing cache expiry, clock-skew, invalid input, onboarding and degraded-health cases.
- [x] Parse the additive observation once at receipt and share connection reporting across existing surfaces.
- [x] Validate failed-refresh/navigation browser behavior and run control-plane-mode full validation: 1,290 tests / 238 files plus 11 affected browser fixtures pass.
- [x] Complete independent review and prepare coordinated contract/PR handoff. Both important findings are fixed and verified; no minor findings remain. Exact-head hosted results are recorded in [draft PR 35](https://github.com/acornops/management-console/pull/35) after push.

Preserve legacy payload compatibility, stored health, permission policy and command routing. No agent protocol changes.
