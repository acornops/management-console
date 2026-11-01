# Windows VM final catch-all: console

Status: source implementation and review complete. Coordinated plan: [AgentV final catch-all](../../../../agentv/docs/exec-plans/completed/windows-final-catch-all.md).

Use existing connection freshness for installation labels and confirmation,
preserving legacy online/degraded behavior and enrollment/policy authority.
Verify Linux/Windows stale observations, cached expiry, confirmation and existing
onboarding in targeted unit/browser tests, then control-plane-mode validation.

Final local validation: `VITE_APP_DATA_MODE=control-plane npm run validate`
passes 1,306 tests/238 files and every required gate. Twelve affected Playwright
cases pass (six onboarding, three heartbeat and three collection-health cases).
Connection labels/confirmation honor expiry; initial command eligibility stays
on stored `unknown` status. Hidden command-step errors now use the existing alert.
Independent coordinated review has no blocking source findings. Exact-revision
hosted evidence is recorded on draft PR #35; no Windows rollout is qualified.

Hosted browser CI exposed a VM policy fixture that depended on recent-conversation
chooser timing. It now explicitly supplies no recent activity, following the
existing capability-fixture pattern; policy/tool assertions and production chat
behavior are unchanged. All eight adjacent overview browser cases pass locally.
