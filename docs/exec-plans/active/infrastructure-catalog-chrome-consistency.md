# Infrastructure Catalog Chrome Consistency

## Goal

Make the Kubernetes Clusters and Virtual Machines catalog routes use the same
route-header and tab-strip composition as the Kubernetes Resources explorer.

## Constraints

- Preserve route-backed search and status filters.
- Preserve catalog counts, loading, error, empty, and destructive-action behavior.
- Use the existing `PageShell`, `PageHeader`, and `ResourceCategoryTabs`
  vocabulary without introducing page-local spacing values.

## UX Acceptance Criteria

- Neither infrastructure catalog shows an inventory or fleet summary banner.
- Both catalog tab strips start on the route content grid used by Kubernetes
  Resources.
- Both tab strips have the canonical 24px separation from their catalog
  controls and content.
- Desktop and compact layouts remain free of horizontal route overflow.

## Validation Log

- Focused catalog regression tests passed.
- `npm run validate` completed all code and route checks, but its visual snapshot
  stage could not launch because `/usr/bin/google-chrome` is unavailable in the
  execution environment.
- The remaining validation commands passed individually: design-system check,
  lint, unit tests, membership check, contract check, harness check, production
  build, and route smoke checks.
- Browser verification reached the local console sign-in gate. Authenticated
  route inspection requires the local control-plane stack, which was not
  available during this change.

## Completion Criteria

- Focused catalog tests and all available repository validations pass.
- Authenticated visual inspection remains a follow-up when the local
  control-plane stack and browser binary are available.
