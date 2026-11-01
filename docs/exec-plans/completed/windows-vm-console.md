# Windows VM console

Approved design: extend existing VM components with OS-aware branches and preserve Linux defaults, exact service validation, copy, and installation lifecycle.

| Concept | Shared target model? | Kubernetes-specific? | VM-specific? | Decision |
| --- | --- | --- | --- | --- |
| OS / service manager | no | no | yes | Immutable Linux/systemd or Windows/SCM pair; omitted legacy metadata means Linux. |
| Registration availability | no | no | yes | Control plane authorizes Windows; optional discovery never blocks Linux. |
| Host access | capability | no | yes | Windows read-only; Linux exact-unit allowlist unchanged. |
| Metrics / logs | interface | no | yes | Preserve unavailable values; Windows Application/System channels. |

1. RED: add focused parser, API, onboarding/access, telemetry, settings, and log tests; exercise discovery safety in the browser.
2. GREEN: implement minimal typed API and existing-component branches. Ignore stale workspace discovery, retain explicit Windows choice on failure, and leave server as final authority.
3. Verify: focused tests, control-plane `npm run validate`, contract checks, actual backend Linux/Windows browser checks with commands masked. Preserve three existing agents and server.
4. Document compatibility, self-review, commit explicit files, and report evidence to coordinating agent.

Producer: existing control-plane API and mirrored public operations. Consumer only: management-console. No backend contract change or installer qualification claim.

## Completion evidence

- Focused RED/GREEN cycles covered legacy Linux defaults, invalid explicit platform pairs, Windows read-only policy, unchanged Linux allowlists/install copy, Windows settings, absent metrics, native channel queries, and channel-preserving exports.
- `VITE_APP_DATA_MODE=control-plane npm run validate`: passed (236 test files / 1,251 tests; contracts, harness, design checks, build, bundle budget, and route smoke included). The preview-server stage required sandbox permission to bind localhost; the final wrapper exited 0.
- `node scripts/harness/check-platform-contracts.mjs` from the feature workspace: passed.
- Actual disposable control-plane/browser checks: unchanged Linux read-only default, wildcard rejection/exact-unit acceptance, original Linux enrollment request and copied shell command; explicit Windows/SCM registration, read-only-only access, copied PowerShell command, immutable settings, unavailable swap, and system-volume label. Enrollment command screenshots were masked; commands were never executed/downloaded.
- Actual Windows Application/System log requests returned 200 and empty output. Bounded intercepted synthetic entries separately verified late channel/target/workspace response isolation in the production page. Production-hook browser checks verified stale discovery and selected-Windows failure safety. All completed browser checks had zero page errors.
- Existing agents and dev server stayed running. No backend, runtime, or release source changed. Native installer/service-host/Core/Desktop/reboot qualification remains separate and is not established by this console work.
