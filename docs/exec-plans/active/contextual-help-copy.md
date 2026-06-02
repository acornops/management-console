# Contextual Help Copy

## Goal

Clarify jargon-heavy controls without adding onboarding, persistent help panels, route changes, or control-plane contract changes.

## Scope

- Add concise inline help for MCP health checks and tool enablement.
- Add concise inline help for resource namespace and category filters.
- Add concise inline help for guarded chat approvals.
- Keep English and Chinese locale keys in sync.

## Validation Plan

- Red/green source guard: `npm run test -- src/styles.test.ts`
- Required static check: `npm run lint`
- UI source audit: `npx impeccable --json --fast src`

## Notes

- Docs impact is limited to this execution note because the change is UI copy only.
- No API, routing, auth, or control-plane contract behavior is changed.
