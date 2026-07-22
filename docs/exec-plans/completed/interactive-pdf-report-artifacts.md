# Interactive PDF report artifacts

## Goal

Expose a contextual Generate PDF action for completed target-chat assistant
responses.

## Interaction

- Place the action beside Copy in the existing message action row.
- Export the exact persisted assistant response through the control-plane API.
- Show loading, success, and failure states with accessible labels.
- Start the authenticated PDF download after creation succeeds.
- Do not show the action for pending, failed, cancelled, or contentless turns.

## Verification

- API client contract tests.
- Assistant message action rendering and state tests.
- Control-plane-mode contract, type, and route validation.

## Delivery

Shared branch: `feat/extensible-catalog-sources`.
Merge order: control-plane, execution-engine, management-console.

## Outcome

- Added the completed-message PDF action beside Copy, including touch-visible,
  loading, success, failure, reduced-motion, and accessible status behavior.
- The action sends only the run ID and optional title, then follows the
  authenticated control-plane artifact URL.
- Verified TypeScript, design-system rules, contract checks, and focused API
  and chat-polish tests (22 passed).
