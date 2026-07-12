# Login Alert Debug Motion

## Goal

Replace the right-side login loop with one readable operational story: an alert arrives, the squirrel investigates three acorn-shaped evidence signals, and the incident resolves.

## Constraints

- Keep the login form and authentication behavior unchanged.
- Use repository color and typography tokens in both themes.
- Keep motion decorative to the login illustration and hide it below the existing desktop breakpoint.
- Respect `prefers-reduced-motion` by rendering the completed diagnosis without animation.
- Animate transforms and opacity, not layout properties.

## UX Acceptance Criteria

- One relevant Kubernetes alert is the dominant surface, not a collection of unrelated cards.
- The squirrel has independently articulated tail, head, paws, mouth, cheek, and shadow layers.
- The loop reads in order: alert, reaction, evidence drop, three investigative bites, resolution.
- The three acorns are labeled as events, deploy, and limits so the metaphor remains operationally legible.
- The resolved state names the root cause and remediation.
- Motion enters with deceleration, exits with acceleration, and pauses long enough to read the outcome.

## Validation Log

- `npm run lint`: passed.
- `npx vitest run src/styles.test.ts`: passed, 35 tests.
- `npm run build`: passed.
- Live Chrome capture at 1440 × 1000: verified the alert/investigation state and the resolved/root-cause state.
- `npm run validate`: passed, including 108 test files and 687 tests, membership, contract and harness checks, production build, and route smoke checks.

## Completion Criteria

- Completed. Focused guards, TypeScript, the full validation entrypoint, and live browser inspection all pass.
