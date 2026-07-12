# Authenticated Console Design System

## Scope

All authenticated console surfaces use the operator's-ledger visual language. The Schedules route is the baseline for responsive margins, route hierarchy, neutral creation actions, table density, borders, and surface treatment. Login remains a separate brand composition while sharing color and typography tokens.

This work changes UI composition only. URLs, permissions, route state, table columns, workflows, API payloads, and control-plane contracts remain unchanged.

## Supported interface

Page code supplies content and semantic intent through typed shared primitives:

- `PageShell`, `PageHeader`, and `PageSection` compose routes and embedded sections.
- `DataSurface` and `TableToolbar` compose framed operational data and its loading, empty, and error states.
- `DialogFrame` and `DrawerFrame` provide the canonical overlay header, body, footer, close control, width presets, focus containment, Escape behavior, and focus restoration.
- `Button`, `Select`, `Checkbox`, `Radio`, `Switch`, `MenuTrigger`, `MenuItem`, `FieldLabel`, and `HelpText` provide the control vocabulary.

The supported button intents are neutral `primary`, `secondary`, `tertiary`, `icon`, and `danger`, plus orange `activation`. Activation is limited to workflow launch or activation. Create, Add, Invite, Save, Continue, and routine Run actions are neutral primary actions.

## Invariants and allowed variation

Pages may retain layouts that match their work: tables, split panes, resource explorers, chat transcripts, charts, detail panels, or settings rows. The following remain invariant:

- responsive route margins and scrolling ownership;
- route title and description hierarchy;
- action alignment and semantic button intent;
- control height, corner, focus, disabled, loading, and keyboard behavior;
- token-only surfaces, borders, text, and status colors in both themes;
- shared loading, empty, error, destructive, dialog, and drawer anatomy.

`scripts/design-system-exceptions.json` is the reviewed source of embedded-route and brand-illustration exceptions. Each entry requires a durable reason. It is not a general allowlist for local styling.

## Catalog and enforcement

Run `npm run design:catalog` and open `/design-system.html` to inspect light and dark component states at responsive widths. The catalog is a development entrypoint and is not registered in the production application router or included as a production build entry.

`npm run design:check` runs in normal and CI validation. It rejects native select, checkbox, and radio controls outside the primitives; custom switches; the retired `accent` button intent; activation buttons outside reviewed workflow contexts; component-local literal colors; copied route-shell signatures; and authenticated route pages without shared composition or a documented embedded exception.

## Ownership

The management-console repository owns these components, tokens, catalog snapshots, exception review, and migration documentation. Feature owners supply semantic content and preserve route and control-plane behavior. Changes to shared primitives require component tests, accessibility evidence, catalog coverage, and `npm run design:check`.
