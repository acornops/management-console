# Cluster Write Access Catalog Polish

## Goal

Replace the cluster card's ambiguous write-guard fact with a concise
`Write access` outcome backed by the control-plane agent capability ceiling.

## Scope

- Map the additive cluster `agentAccessMode` response field.
- Show `Read only`, `Approval required`, `Write enabled`, or `Unavailable` in
  the existing operational-detail row.
- Keep virtual-machine cards unchanged while their agent access posture is
  uniform.
- Add English and Mandarin copy plus focused unit coverage.

## Compatibility

An omitted or `unknown` access mode renders as unavailable, supporting a
control-plane-first rolling deployment.

## Validation

- Focused mapper and catalog presentation tests
- Lint, contract, design-system, and route checks
- Responsive light and dark browser verification

## Outcome

- Cluster cards now present `Write access` as an operational fact rather than
  adding a badge beside the resource name.
- Desktop, mobile, light, and dark layouts were verified with no horizontal
  overflow or console warnings.
- Focused tests, lint, build, contract checks, route smoke tests, and the
  cross-repository contract mirror check pass.
