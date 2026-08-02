# Workflow Exception-Status Consistency

## Goal

Make the workflow library and detail surface reserve status treatments for
exceptions, clarify policy versus effective capability, and keep compact
workflow navigation fully discoverable.

## Scope

- Hide routine positive readiness presentation while preserving blocked and
  inactive guidance.
- Present capability counts as data instead of semantic status pills.
- Clarify workflow policy and outbound webhook labels.
- Remove repeated coordination labels from selected Agent rows.
- Tighten the compact workflow discovery composition and ensure every workflow
  section remains visible.

## Constraints

- Preserve draft, paused, blocked, inactive, approval, and failure signals.
- Preserve route-backed tabs, keyboard behavior, and control-plane data.
- Preserve unrelated work already present in the dirty worktree.

## Validation

- `npm run app:typecheck` passed.
- Focused workflow and navigation unit tests passed: 4 files, 26 tests.
- Focused workflow Playwright coverage passed at desktop and compact widths:
  2 workflow tests and 1 short-desktop navigation test.
- `git diff --check` passed.
- `npm run validate` reached the full Vitest suite after the UI package,
  design checks, export checks, and application typecheck passed. It stopped on
  the pre-existing `TraceFooter.polish.test.ts` source
  assertion, which still expects an unconditional timeline scroll handler even
  though `TraceFooter.tsx` now attaches it only for the contained layout.

## Outcome

Routine healthy states no longer compete with workflow content. The workflow
surface now uses pills for actionable exceptions, renders policy and zero-count
capability data as neutral metadata, clarifies the outbound-webhook navigation
label, and keeps all workflow tabs visible at compact widths.
