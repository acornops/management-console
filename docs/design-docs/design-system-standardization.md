# Authenticated Console Design System

## Scope

All authenticated console surfaces use the operator's-ledger visual language. The Schedules route is the baseline for responsive margins, route hierarchy, neutral creation actions, table density, borders, and surface treatment. Login remains a separate brand composition while sharing color and typography tokens.

This work changes UI composition only. URLs, permissions, route state, table columns, workflows, API payloads, and control-plane contracts remain unchanged.

## Supported interface

Page code supplies content and semantic intent through typed shared primitives:

- `PageShell`, `PageHeader`, and `PageSection` compose routes and embedded sections.
- `DataSurface` and `TableToolbar` compose framed operational data and its loading, empty, and error states.
- `DialogFrame` and `DrawerFrame` provide the canonical overlay header, body, footer, close control, width presets, focus containment, Escape behavior, and focus restoration.
- `Button`, `Select`, `Checkbox`, `Radio`, `Switch`, `MenuTrigger`, `MenuItem`, `ThemeMenu`, `FieldLabel`, and `HelpText` provide the control vocabulary.

The supported button intents are neutral `primary`, `secondary`, `tertiary`, `icon`, and `danger`, plus orange `activation`. Activation is limited to workflow launch or activation. Create, Add, Invite, Save, Continue, and routine Run actions are neutral primary actions.

Button foregrounds and fills resolve through control-specific tokens. Dark primary and secondary controls use light text on warm dark fills. Dark activation uses `#B8441F` and dark danger uses `#A92C3C`, both with `#F5F1EF` text. Interactive boundaries use the `#777371` dark token where a control or focus boundary must reach 3:1 against adjacent surfaces. Do not build a filled control by swapping generic page background and text tokens.

## Theme interface

The preference model is `System`, `Light`, or `Dark`; rendering consumers receive the resolved light or dark appearance. Missing and invalid preferences become `System`. Stored explicit choices remain valid, and a stored profile preference takes precedence over the global preference.

`System` follows `prefers-color-scheme` and subscribes to operating-system changes only while active. The synchronous theme bootstrap runs before the application module, applies the resolved root class, and synchronizes browser `theme-color` with `#FCFAF6` or the dark canvas `#121110`.

Login, desktop account navigation, and mobile navigation use the same `ThemeMenu` and destination-oriented `ThemeToggleIcon`. The menu exposes Monitor, Sun, and Moon options through `menuitemradio`, checked state, Arrow, Home, End, and Escape keys, outside-click dismissal, and trigger focus restoration. The icon swaps opacity, rotation, and scale in 160 ms while the live page recolors beneath the non-occluding 320 ms ripple.

## Invariants and allowed variation

Pages may retain layouts that match their work: tables, split panes, resource explorers, chat transcripts, charts, detail panels, or settings rows. The following remain invariant:

- responsive route margins and scrolling ownership;
- route title and description hierarchy;
- action alignment and semantic button intent;
- control height, corner, focus, disabled, loading, and keyboard behavior;
- token-only surfaces, borders, text, and status colors in both themes;
- the docs-derived dark neutral ramp: `#121110`, `#1E1A18`, `#2D2827`, `#464140`, `#F5F1EF`, and `#A6A1A0`;
- shared loading, empty, error, destructive, dialog, and drawer anatomy.

`scripts/design-system-exceptions.json` is the reviewed source of embedded-route and brand-illustration exceptions. Each entry requires a durable reason. It is not a general allowlist for local styling.

## Catalog and enforcement

Run `npm run design:catalog` and open `/design-system.html` to inspect light and dark component states at responsive widths. The catalog includes theme-toggle, code-surface, segmented-tab, filter-toggle, and compact-control examples. It is a development entrypoint and is not registered in the production application router or included as a production build entry.

`npm run design:check` runs in normal and CI validation. It rejects native select, checkbox, and radio controls outside the primitives; custom switches; the retired `accent` button intent; activation buttons outside reviewed workflow contexts; component-local literal colors; every standard named Tailwind palette; `backdrop-blur`; copied route-shell signatures; and authenticated route pages without shared composition or a documented embedded exception. Raw buttons must use one of the tested shared sizing helpers or the canonical responsive `control-target` utility. The explicit 40 px desktop-sidebar navigation row is the sole desktop-only target exception.

## Ownership

The management-console repository owns these components, tokens, catalog snapshots, exception review, and migration documentation. Feature owners supply semantic content and preserve route and control-plane behavior. Changes to shared primitives require component tests, accessibility evidence, catalog coverage, and `npm run design:check`.
