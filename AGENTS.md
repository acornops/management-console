# Management Console Agent Entry Point

Use this file as a map, not as the full source of truth. The repository knowledge base lives in the linked docs.

## Agent-Assisted Development

This repository supports human and agent-assisted development. When using a coding agent directly inside this repo, start from this repository root and read this file before editing files.

For work that touches multiple AcornOps repositories, start the agent from the `acornops-workspace` root instead. The workspace root contains the cross-repo manifest, shared skills, validation helpers, and PR coordination workflow.

## Start Here

- [Architecture](ARCHITECTURE.md)
- [Docs Index](docs/index.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Operations Guide](docs/OPERATIONS.md)
- [Contracts](docs/contracts/README.md)
- [Design Notes](docs/design-docs/index.md)
- [Product Scope](docs/product-specs/index.md)
- [Plans](docs/PLANS.md)
- [Agent Handoff](docs/AGENT_HANDOFF.md)
- [Quality Score](docs/QUALITY_SCORE.md)
- [Maintainability Rules](docs/MAINTAINABILITY.md)
- [Reliability Rules](docs/RELIABILITY.md)
- [Security Policy](docs/SECURITY.md)
- [Security Model](docs/security-model.md)

## Component Map

- `src/pages`: route-level pages
- `src/features`: cluster detail flows, trace rendering, and session behavior
- `src/services/controlPlaneApi.ts`: control-plane client and data mapping layer
- `src/hooks` and `src/utils`: routing, state, and UI support
- `src/components`: reusable UI surfaces

## Working Rules

- Treat `docs/` as the system of record for repository knowledge.
- Keep this file short. Push durable UI rules and workflow context into linked docs instead of adding ad hoc instructions here.
- If a change affects control-plane contracts, update the mirrored contract docs and manifests in counterpart repos in the same change.
- If work spans multiple steps or design decisions, create an execution plan in `docs/exec-plans/active/`.
- Shared skills live in `.agents/skills/shared`; repository-owned skills live in `.agents/skills/local`.
- Agent tools may not auto-discover nested skills. When a task matches a skill description, open the relevant `SKILL.md` from `.agents/skills/shared` or `.agents/skills/local` before editing.
- Do not edit `.agents/skills/shared` here; update shared skills in the parent `acornops-workspace` repo and sync them into this repo.
- Follow [Agent Handoff](docs/AGENT_HANDOFF.md) before final response, commit, or pull request handoff.
- Keep this harness vendor-neutral; do not add required vendor-specific instruction files.

## Required Validation

- `npm run lint`
- `npm run test`
- `npm run contracts:check`
- `npm run harness:check`
- `npm run smoke:routes`
- `npm run validate`
- Run in `VITE_APP_DATA_MODE=control-plane` when validating contract-sensitive UI changes

## High-Risk Areas

- Auth redirects and cookie-backed session behavior
- Route/deep-link compatibility at the root path served from `console.acornops.dev`
- Run trace rendering and SSE/replay handling
- Tool settings and MCP server configuration screens

## Documentation Hygiene

- Document new or changed features in the same change; if docs do not change, include `Docs impact: none` and the reason in handoff evidence.
- Update [docs/index.md](docs/index.md) when adding or moving durable knowledge.
- Keep [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md) current when setup or runtime behavior changes.
- Keep [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) and [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) current when you discover lasting gaps.
