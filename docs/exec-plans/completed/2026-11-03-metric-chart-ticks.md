# Metric chart tick precision

Status: implementation and local validation completed on `fix/telemetry-insights`.
Release and demo rollout evidence is tracked by the coordinated release record.

## Scope

The y-axis currently rounds quarter-scale values to one decimal below 10 and
whole numbers above it. A gridline at 0.75 therefore reads 0.8, and memory
gridlines around 1 GiB show similarly rounded values.

Choose a readable tick step and derive label precision from that step. Keep a
zero baseline, at least 12% headroom, the existing minimum range, units,
dimensions, empty states, and accessible data table. Do not change the chart
API, x-axis, source values, dependencies, or percentage limits.

## Tasks

- [x] Add rendered regression tests and observe failures before implementation.
- [x] Derive the scale and locale-aware labels from a readable tick step.
- [x] Run focused tests, `npm run validate`, and inspect a rendered chart.
- [x] Record validation and remaining risks before handoff.

## Validation

The scale selects a step from 1, 2, 2.5, 5, or 10 times a power of ten and
rounds the upper bound upward. Labels use `Intl.NumberFormat` with enough
fractional digits for that step. Points and gridlines use the same upper bound.
Some ranges now have three intervals; others retain four.

- `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run test -- src/components/common/MetricChart.test.tsx`:
  nine expected failures and one passing accessible-table check before the fix;
  all ten passed after it. Cases cover zero and small positive values, CPU
  around 0.81 cores, memory around 1 GiB, a 2.5 step, percentages near 61.5 and
  above 100, larger ranges, locale formatting, and point/gridline agreement.
- `npm run validate`: the first run passed all 241 test files / 1,338 tests and
  build checks, then failed because the sandbox denied the route-smoke preview
  port (`listen EPERM 127.0.0.1:4179`). The approved retry passed the complete
  gate, including route smoke checks. No product changes were needed for it.
- `npm run dev -- --host 127.0.0.1 --port 4197 --strictPort` and
  `node test-results/metric-chart/check.mjs`: a temporary Chromium harness
  passed at 552 px and 320 px card widths, including decimal-comma labels.
  Screenshots were inspected. No page overflow or browser errors occurred.
  At 320 px, `0.25 cores` reaches 10.04 px outside the SVG box but remains
  6.96 px inside its card; the existing `overflow-visible` retains the label.
  The first sandboxed browser launch was denied by macOS; the approved retry
  passed. The temporary server was stopped, and evidence stays in ignored
  `test-results/metric-chart/`.

## Limits

The host ran Node 24.2.0: its `node@22` path points to the Node 24 installation.
Node 22 release qualification remains unverified. `validate:full` was skipped
as required for this localized change. The build reports the existing stale
Browserslist data warning. Chart dimensions, empty states, units, and source
data remain unchanged; the fixed label gutter is not a general solution for
arbitrarily long units or labels.
