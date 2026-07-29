# AI provider key polish

Status: completed

Coordination slug: `fix/ai-key-settings-polish`

## Goal

Clarify provider credential provenance in Workspace AI Settings and align the
provider actions with the console's compact control vocabulary.

## Scope

- Keep inherited-platform copy on one desktop line where space allows.
- Use exactly one provenance badge per provider: Not configured, Configured
  with platform defaults, or Configured with workspace key.
- Keep configured provenance badges semantic green.
- Make Rotate key compact and the same intrinsic size as Delete key.
- Preserve write-only credential behavior and existing API calls.

## Coordination

The matching platform-admin change uses the same provider-row hierarchy and
status semantics. No integration contract or merge-order dependency exists;
the two UI changes may merge independently.

## Validation

- Focused AI settings coverage passes with the exact provenance copy and compact
  action assertions.
- TypeScript, design enforcement, 694 unit tests, 171 repeated fixture checks,
  21 repeated MCP-parity checks, membership, contracts, harness, production
  build, and route smoke checks pass.
- Desktop and 390 px browser review confirms no horizontal overflow, one-line
  Add workspace key labels, and matching intrinsic Rotate/Delete widths.
- The shared design-catalog snapshot suite has 15 passes and one intentional
  skip; its four light/dark catalog baselines differ only by a two-pixel total
  page-height shift after restoring the current Playwright browser runtime.
  Those unrelated baselines were preserved.
