# Destructive Confirmation Hardening

## Scope

- Harden destructive confirmation UX for workspace, Kubernetes cluster, MCP server, chat session, Agent, Agent capability, member-access, external-integration, target-skill, target-Insights, workspace AI credential, and catalog-source actions.
- Preserve typed confirmation for high-blast-radius workspace, target, cluster,
  virtual-machine, and workflow deletion.
- Keep the remaining destructive actions as confirm/cancel flows using the shared destructive-confirmation dialog.
- Keep reversible disable, credential-mode change, draft-discard, and webhook-secret rotation confirmations inline.
- Remove native `window.confirm` usage.
- Do not change control-plane APIs, routes, payloads, or backend behavior.

## Plan

1. Add source guards for typed confirmation, concrete consequence copy, native-confirm removal, and destructive inline-confirmation removal.
2. Keep high-blast-radius delete dialogs locked until their typed resource name matches.
3. Align simple destructive actions with `DestructiveConfirmationDialog`, including Agent and capability removal, member access removal, integration unlinking, target skill and Insights reset, workspace AI credential deletion, and catalog-source deletion.
4. Keep confirmation inside the current surface only for reversible or non-destructive actions, and avoid nested modal overlays by transitioning the member drawer to its confirmation dialog.
5. Run targeted dialog tests, `npm run lint`, `npm run validate`, and `npx impeccable --json --fast src`.

## Notes

- Docs impact is this execution note plus clarification of the durable dialog-versus-inline boundary; no control-plane contract behavior changes are intended.
- Security impact is limited to front-end explicit opt-in hardening for irreversible UI actions.
