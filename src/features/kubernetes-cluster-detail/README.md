# Kubernetes Cluster Detail Module

This directory contains the modularized Kubernetes cluster detail feature. It is intentionally scoped to Kubernetes diagnostics, resources, chat, MCP servers, and cluster settings; future VM detail UI should live in a sibling feature, not in this module.

## Structure

- `types.ts`
  - Shared, strongly typed contracts for cluster-detail UI state and run traces.
- `lib/helpers.ts`
  - Generic utility helpers (`createLocalMessageId`, `sleep`, `toTimestamp`, preview/truncate helpers).
- `lib/session-utils.ts`
  - Session/message normalization, session upsert behavior, and user-facing failure formatting.
- `lib/trace-utils.ts`
  - Reasoning trace transformations, usage parsing, status labels, and trace-step mutation helpers.
- `lib/markdown.tsx`
  - Reusable markdown rendering components for consistent assistant-response presentation.
- `components/TraceFooter.tsx`
  - Expandable reasoning footer tied to each assistant message.
- `components/detail/views/*`
  - Feature-focused UI panels (`Overview`, `Resources`, `MCP Servers`, `Health`, `Chat`).
- `components/workloads/*`
  - Kubernetes resource and workload explorer UI used by the Resources view.
- `hooks/useTargetChat.ts`
  - Stateful run orchestration hook for chat, streaming, and trace reconciliation.

## Design Principles

- Keep stateful orchestration in `KubernetesClusterDetail.tsx`.
- Keep rendering logic in dedicated, focused view components.
- Keep formatting and transformation rules in testable pure utility modules.
- Use descriptive function names and short docs on non-obvious behavior.

## Extension Points

- Add new Kubernetes cluster tabs by introducing a new `components/detail/views/*` component and a `View` union update in `types.ts`.
- Add run-trace states/events in `lib/trace-utils.ts` and wire them via `handleRunEvent` in `hooks/useTargetChat.ts`.
- Add markdown-specific rendering customizations in `lib/markdown.tsx` without touching chat flow logic.
