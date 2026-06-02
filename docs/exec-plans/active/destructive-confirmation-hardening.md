# Destructive Confirmation Hardening

## Scope

- Harden destructive confirmation UX for workspace, Kubernetes cluster, MCP server, and chat session delete dialogs.
- Add typed confirmation only for workspace and cluster deletion.
- Keep MCP server and chat session deletion as confirm/cancel flows.
- Do not change control-plane APIs, routes, payloads, or backend behavior.

## Plan

1. Add source guards for typed confirmation and concrete consequence copy.
2. Update workspace and cluster delete dialogs with typed confirmation inputs and disabled delete buttons until the typed name matches.
3. Align MCP server and chat delete dialogs with the same danger-dialog layout and concrete copy without typed confirmation.
4. Run targeted dialog tests, `npm run lint`, and `npx impeccable --json --fast src`.

## Notes

- Docs impact is this execution note only; no durable product or contract behavior changes are intended.
- Security impact is limited to front-end explicit opt-in hardening for irreversible UI actions.
