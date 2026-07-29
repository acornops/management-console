# AI provider badge source split

Status: completed

Coordination slug: `fix/ai-key-settings-revert`

## Goal

Show configuration state and credential source as separate badges in Workspace
AI Settings.

## Scope

- Configured providers show a green `Configured` badge.
- Configured providers also show a neutral `Platform default` or `Workspace key`
  source badge.
- Unconfigured providers retain the neutral `Not configured` badge.
- Credential behavior, inherited guidance, and provider actions stay unchanged.

## Coordination

The platform-admin console separately restores its prior provider-card
presentation. No API, schema, contract, deployment, or merge-order dependency
exists between the two UI changes.

## Validation

- Focused source and localization evidence passes.
- TypeScript, 694 unit tests, contracts, harness, production build, and route
  smoke checks pass.
- Desktop and 390 px browser review confirms the green Configured badge,
  neutral Workspace key source badge, neutral unconfigured state, and no
  horizontal overflow.
