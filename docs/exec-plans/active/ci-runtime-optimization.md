# CI Runtime Optimization

## Goal

Reduce full management-console GitHub Actions feedback from the observed
23-minute baseline without removing validation coverage or weakening release
gates.

## Baseline

- The successful full CI run on 2026-08-02 took 23m03s.
- Fixture smoke used 93 logical tests repeated three times, for 279 executions.
- MCP parity used 7 logical tests repeated three times, for 21 executions.
- Design-route validation covered 39 routes across five projects through 35
  serial route chunks plus one forced-colors invocation.
- Browser validation accounted for 18m45s of the 20m33s validation step.

## Constraints and decisions

- Keep every logical fixture, MCP parity, snapshot, and design-route check.
- Run each fixture and MCP parity test once; use targeted repetition only when
  diagnosing a suspected timing race.
- Run lint, type checks, unit coverage, contracts, harness checks, and the
  production build before allocating browser runners.
- Preserve `validate:ci` as the complete local and release validation entrypoint.
- Parallelize design-route projects on isolated runners rather than raising
  browser concurrency inside one runner.
- Keep existing route chunk size, worker counts, retry policy, and visual
  thresholds unchanged in this pass.
- Measure browser installation after fan-out before adding a cache or pinned
  container image.

## Implementation

1. Split `validate:ci` into explicit preflight and browser scripts.
2. Remove `--repeat-each=3` from fixture and MCP parity scripts.
3. Make GitHub CI run preflight first, then fan snapshots, fixtures, MCP parity,
   and each design-route project out through a fail-fast browser matrix.
4. Make image-release validation run the same preflight and browser gates in
   sequence before building and publishing.
5. Add harness assertions for the gate boundary and single-pass smoke policy.
6. Update the operations guide and record validation and GitHub timing evidence.

## Acceptance criteria

- A preflight failure prevents all browser matrix jobs from starting.
- Fixture smoke reports one execution per logical test.
- MCP parity reports one execution per logical test.
- All five design-route projects and the forced-colors check still run.
- Coverage uploads once from preflight and browser failure artifacts have unique
  names.
- `npm run validate:ci` remains a complete, passing sequential release gate.
- Full GitHub CI completes in less than 12 minutes initially, targeting a median
  below 10 minutes across three representative full runs.

## Validation log

- `actionlint .github/workflows/ci.yml .github/workflows/release.yml`
  - Passed.
- `npm run harness:check`
  - Passed.
- `npm run validate:ci:preflight`
  - Passed outside the filesystem sandbox so the route-smoke preview server
    could bind to loopback.
  - Unit coverage passed across 185 files and 858 tests.
- `npm run design:snapshots`
  - Passed: 25 tests; 1 intentional project-specific skip.
- `npm run smoke:fixtures`
  - Passed: 93 tests in one execution each; 4.4m locally with one macOS worker.
- `npm run smoke:mcp-parity`
  - Passed: 7 tests in one execution each; 49.6s locally.
- `npm run validate:ci:browser`
  - The snapshot stage passed, then local design-route validation stopped
    because this repository tracks route baselines only for Linux. The
    generated untracked macOS baselines were removed. Fixture and MCP parity
    stages were validated separately as recorded above.
- GitHub Actions run `30744022932`, attempt 1
  - Preflight passed in 1m31s and correctly gated all browser jobs.
  - A mobile-light route screenshot exposed a nondeterministic document scroll
    on `workspace-incoming-webhooks`; matrix fail-fast cancelled the remaining
    long-running jobs.
- GitHub Actions run `30744022932`, attempt 2
  - The failed and cancelled jobs passed unchanged, confirming the mismatch was
    a harness race rather than a product or baseline regression.
- GitHub Actions run `30744022932`, attempt 3
  - A fresh full run reproduced the same incoming-webhooks scroll mismatch in
    mobile-dark. The shared route preparation now waits for tab scroll effects
    to settle and resets the document to the baseline scroll position.
- GitHub Actions run `30744896755`, attempt 1
  - Mobile-dark passed with the route preparation change, but mobile-light
    reproduced the same late document scroll. The active-tab component now
    preserves the viewport around its horizontal `scrollIntoView`, fixing the
    page jump at the source while retaining compact-tab visibility.
- GitHub Actions run `30745187201`, attempt 1
  - Mobile-light still reproduced the displacement because authenticated
    routes scroll inside `.page-shell`, not the window. Active-tab reveal now
    preserves that canonical scroller's `scrollTop` directly.
- GitHub Actions run `30745526180`, attempt 1
  - Incoming webhooks passed after preserving `.page-shell` scroll in compact
    tabs. The generic harness reset then displaced the intentionally deep-linked
    MCP registries route, so that reset was removed; route-specific scrolling
    remains intact.
- GitHub Actions run `30745830338`, attempt 1
  - Passed every preflight and browser job on the first attempt.
  - Completed in 6m00s wall-clock, down from 23m03s (17m03s / 74% faster).
  - Preflight completed in 1m29s before any browser runner started.
  - The fixture shard remained the critical path at 4m11s; all other browser
    shards completed in 2m48s or less.
  - Dependency installation took 10-11s and Playwright browser installation
    took 20-29s per shard. Caching or a pinned browser image is deferred because
    it offers materially less benefit than the completed test fan-out and may
    add cache maintenance or invalidation risk.

The initial sub-12-minute target is satisfied. Establishing the below-10-minute
median still requires two more representative full runs rather than rerunning
identical CI solely to manufacture timing samples.

## Completion criteria

- Required local validation passes with exact command results recorded here.
- The first optimized full GitHub Actions run passes and its timing is recorded.
- Any deferred cache, worker, or release-trust optimization is recorded as a
  measured follow-up rather than included speculatively.
