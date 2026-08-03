# Configurable Help Links

## Goal

Use the effective platform documentation and support destinations on the
existing Help page while retaining the current links as built-in fallbacks.

## Compatibility boundary

- Do not require new auth configuration fields from older control planes.
- Preserve the current destinations when fields are missing or invalid.
- Keep localized Help-page labels and descriptions product-controlled.
- Navigate only to validated HTTPS documentation links and HTTPS or `mailto:`
  support links.

## Validation plan

- Add focused runtime-config and Help-page behavior coverage.
- Run targeted tests and management-console validation.
- Verify the Help page in the live browser.

## Outcome

- The existing Help page consumes optional effective destinations and validates
  each destination independently before rendering it.
- Missing or invalid values retain the product's current documentation and
  support links, preserving older-control-plane and malformed-response behavior.
- Full repository validation passes (200 test files, 974 tests), including
  typecheck, design-system checks, contracts, harness, production build, bundle
  budget, and route smoke checks.
