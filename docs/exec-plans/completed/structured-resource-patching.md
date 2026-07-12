# Structured Resource Patching

## Goal

Render deterministic fallback approvals for AgentK `patch_resource` operations.

## UX Acceptance Criteria

- Image and metadata changes identify the target and intent.
- Pod-template mutations explicitly distinguish workload rollout from changes
  that affect only future CronJob Jobs.
- Service selector mutations explicitly warn about traffic redirection.
- Generic write approval rendering remains intact.

## Validation

- Control-plane-mode validation passed: 688 tests, lint, membership, contracts,
  harness, build, and route smoke checks.
- `npm audit --omit=dev` reports zero production vulnerabilities.

## Production Review

- Fallback warnings distinguish workload rollout, future CronJob Jobs, and
  Service traffic redirection.
- Unicode format controls are removed from summaries and escaped in advanced
  argument details to prevent bidirectional-text spoofing.
- Fallback approval analysis is limited to AgentK's ten-change input ceiling;
  malformed oversized upstream input cannot create unbounded rendering work.

## Completion Criteria

Control-plane-mode management-console validation passes.
