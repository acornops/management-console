# Component Deduplication Closure

## Goal

Finish the remaining high-confidence Management Console UI deduplication after
the managed-subject consolidation, while preserving routes, permissions,
control-plane contracts, target-specific behavior, and the existing visual
language.

## Scope

- Replace page-local settings-row copies with the shared settings-row component.
- Share password-field presentation and validation wiring across login and
  account-security flows.
- Consolidate schedule and webhook execution facts, responsive drawer-ledger
  anatomy, and destructive-confirmation configuration.
- Extract target-neutral telemetry presentation while Kubernetes and VM modules
  retain explicit metric adapters.
- Migrate remaining `OverflowActionMenu` call sites to `ActionMenu` and remove
  the behaviorless compatibility export.

## Boundaries

- Preserve the existing dirty-worktree managed-subject changes.
- Do not turn Agents into runtime targets or merge target-specific data models.
- Do not change API payloads, routes, permission meaning, copy, or mutation
  behavior.
- Keep domain-specific rows, actions, telemetry mappings, and failure recovery
  behind explicit adapters or render slots.
- Do not introduce new design-system exceptions.

## Outcome

- Account and workspace settings use the canonical `SettingsRow`.
- Login and account-security flows share one accessible password-field
  implementation while login retains its reveal control and icon treatment.
- Schedule and webhook surfaces share execution facts, compact/wide ledger
  anatomy, and destructive-confirmation foundations through domain adapters.
- Cluster and VM telemetry share fact-grid presentation and target-neutral chart
  projection; target files still own metric selection, formatting, freshness,
  and failure semantics.
- Production call sites and the design catalog use `ActionMenu` directly. The
  obsolete `OverflowActionMenu` export was removed with a Changesets release
  note.

## Validation

- PASS: focused settings and password coverage, 31 tests.
- PASS: focused workflow coverage, 20 tests.
- PASS: focused telemetry coverage, 16 tests.
- PASS: `npm run lint`.
- PASS: `npm run ui:check`; 44 UI modules built and 28 required exports passed.
- PASS: `npm run design:check` across 469 production files.
- PASS: `npm run design:adoption -- --report`; zero violations and zero
  temporary exceptions.
- PASS: `npm run validate`; 206 test files and 1,001 tests passed, membership,
  contracts, harness, production build, 58-chunk bundle budget, and route smoke
  checks passed. The largest chunk was 269,549 bytes.
- PASS: `npm run design:snapshots`; 25 browser checks passed and one
  deterministic platform-specific check remained intentionally skipped.
- PASS: the design-route matrices after reviewing and refreshing seven
  intentional Agent and cluster-settings baselines across desktop, mobile,
  light, and dark coverage.
- PASS: all 127 fixture smoke checks. The environment terminated the monolithic
  runner at its process boundary, so the inventory completed in bounded shards.
- PASS: `npm run smoke:mcp-parity`; all 8 checks passed after aligning the
  provenance fixture with inline Agent definition editing.
- PASS: targeted cluster and VM overview and catalog-accessibility browser
  coverage; 11 checks passed across wide, narrow, dark, error, and accessible
  telemetry states.
- PASS: `git diff --check`.
- `npx impeccable detect --json --fast src packages/ui/src` retains one
  pre-existing parser warning for the documented mono font expression in
  `src/styles.css`; it is unrelated to the component consolidation.

## Completion Criteria

- Audited duplicate implementations are removed or reduced to intentional
  domain adapters.
- Shared components retain accessible labels, errors, keyboard behavior,
  responsive anatomy, and theme-token usage.
- Target-specific metric mapping remains outside shared telemetry presentation.
- Required validation passes with no component-deduplication residual failures.

Status: complete.
