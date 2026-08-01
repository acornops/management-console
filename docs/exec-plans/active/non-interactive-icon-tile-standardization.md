# Non-interactive Icon Tile Standardization

## Goal

Separate non-interactive context glyphs from secondary and icon-button
affordances across the management console.

## Constraints

- Preserve real button, link, focus, hover, disabled, and touch-target behavior.
- Preserve semantic success, warning, danger, and metric meaning.
- Use theme-aware design tokens in both light and dark appearances.
- Preserve feature copy, routes, state, and API behavior.

## UX acceptance criteria

- Decorative neutral glyphs use a flat low-chroma ink tint without a border or
  shadow.
- Identity glyphs may retain orange as the glyph color, but not as decorative
  elevation or a control boundary.
- Semantic glyphs use the matching soft status treatment.
- Icon actions continue to use shared button primitives.
- Shared enforcement rejects reconstructed button-like decorative icon tiles.

## Validation plan

- Run focused shared-component and migrated-surface tests.
- Run shared UI package checks, design checks, lint, and build.
- Run light and dark route visual coverage for representative migrated routes.
- Run the repository validation entrypoint and record unrelated blockers.

## Completion criteria

- The shared primitive, catalog, package documentation, Changeset, and design
  contract describe the same semantic boundary.
- Audited decorative tile call sites use the shared primitive or retain a
  documented interactive or live-status reason.
- Validation evidence and residual visual risks are recorded before handoff.
