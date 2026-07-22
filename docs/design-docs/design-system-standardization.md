# Authenticated Console Design System

## Scope

All authenticated console surfaces use the operator's-ledger visual language. The Schedules route is the baseline for responsive margins, route hierarchy, neutral creation actions, table density, borders, and surface treatment. Login remains a separate brand composition while sharing color and typography tokens.

This work changes UI composition only. URLs, permissions, route state, table columns, workflows, API payloads, and control-plane contracts remain unchanged.

## Supported interface

Page code supplies content and semantic intent through typed shared primitives:

- `PageShell`, `PageBackLink`, `PageHeader`, and `PageSection` compose routes and embedded sections.
- `DataSurface` and `TableToolbar` compose framed operational data and its loading, empty, and error states.
- `SearchFilterFrame`, `DiscoveryFilterBar`, and typed definitions from `createDiscoveryFilterGroup` compose the canonical framed collection search, visible categorical filters, result feedback, and no-match recovery.
- `DialogFrame` and `DrawerFrame` provide the canonical overlay header, body, footer, close control, width presets, focus containment, Escape behavior, and focus restoration.
- `Button`, `Select`, `Checkbox`, `Radio`, `Switch`, `MenuTrigger`, `MenuItem`, `ThemeMenu`, `FieldLabel`, and `HelpText` provide the control vocabulary.

The supported button intents are neutral `primary`, `secondary`, `tertiary`, `icon`, and `danger`, plus orange `activation`. Activation is limited to workflow launch or activation. Create, Add, Invite, Save, Continue, and routine Run actions are neutral primary actions.

Button foregrounds and fills resolve through control-specific tokens. Dark primary and secondary controls use light text on warm dark fills. Dark activation uses `#B8441F` and dark danger uses `#A92C3C`, both with `#F5F1EF` text. Interactive boundaries use the `#777371` dark token where a control or focus boundary must reach 3:1 against adjacent surfaces. Do not build a filled control by swapping generic page background and text tokens.

Page-level return navigation uses `PageBackLink` immediately before `PageHeader`. The primitive owns the left-chevron icon, typography, target height, hover treatment, and focus boundary while page code supplies a real destination URL and optional client-side route interception. Do not render route-level Back navigation as a header action or restyle it within a feature.

Persistent lifecycle controls use the shared neutral, divided `DangerZone` surface. Exit and reversible actions such as logout, leave, and disable use secondary controls before confirmation; irreversible delete and remove actions retain the danger button intent. Reserve soft danger fills for errors, critical status, and active confirmation states rather than permanent settings-card backgrounds. Cluster and VM Settings expose permission-gated deletion through the same typed-name confirmation pattern used by their catalogs.

## Top-level collection discovery

Agents, Workflows, MCP Catalog, Kubernetes clusters, and virtual machines use `DiscoveryFilterBar` as the standard discovery surface. Nested Kubernetes resource search and `DiscoveryFilterBar` both compose `SearchFilterFrame`, which owns the bordered paper surface, `16px` padding, restrained shadow, `12px` gaps, dominant flexible search slot, and consistent `44px` control geometry. Feature code supplies typed filter-group definitions with IDs, labels, current and default values, options, optional stable counts, and typed route-backed change handlers.

Categorical groups render as always-visible shared `Select` controls. Clusters, virtual machines, and agents expose Status; MCP Catalog exposes Source and Compatibility; Workflows uses the search-only composition. When a feature supplies stable option counts, the selected control and listbox options show those counts. Below `sm`, search, selects, trailing actions, and result feedback stack full-width. From `sm` to below `lg`, search owns the first row and multiple selects share equal columns. At `lg` and wider, the toolbar becomes one balanced row: search grows, selects remain approximately `11rem` to `14rem` wide, and the polite result summary holds the trailing edge without overflow. Unfiltered summaries use the direct collection count; filtered summaries show the visible count against the total. Result counts belong in the bar rather than being repeated in catalog headings. Pages omit the bar only when the collection is known to be empty and no discovery state is active; an active search or filter that returns zero items keeps the bar visible.

Each Select applies its typed route-owned `onChange` handler and restores focus to its trigger after selection. Choosing the default option resets only that group. Search clear and Escape remove only the query and retain search focus. Clear all appears when the query plus non-default groups total at least two, clears route-backed discovery state atomically, and restores search focus. Warm neutral tokens carry the frame and controls; orange is limited to focus and selected state.

Top-level discovery state remains route-backed using each page's existing parameter names and history policy. Nested resource explorers and audit-log searches may retain denser local patterns because they are not top-level collection discovery.

## Catalog master-detail layout

Workflows and MCP Catalog use `MasterDetailLayout` for list-to-detail inspection. The component owns one bordered surface, a `32rem` minimum height, no column gap, and a vertical divider. At `lg` and wider, its grid is `minmax(18rem, 22rem) minmax(0, 1fr)` so the library remains stable while detail consumes the available width.

Below `lg`, the route controls which pane is visible. An unselected route shows the library; selecting a row shows detail with a compact Back action. Back removes only the resource and detail-tab parameters, preserves discovery and unrelated panel state, and returns focus to the selected row. Desktop may preview the first visible result, but a preview is not serialized until the operator selects it or interacts with its detail tabs.

The shared family also owns the `24px` discovery-to-surface gap, list heading, resource-row anatomy, loading and empty states, detail header, and tinted detail body. Rows use the same title, description, status, and metadata structure with common padding and selection treatment. Feature pages supply the values and retain task-specific controls such as workflow tabs and launch actions or MCP source filters and installation fields.

## Theme interface

The preference model is `System`, `Light`, or `Dark`; rendering consumers receive the resolved light or dark appearance. Missing and invalid preferences become `System`. Stored explicit choices remain valid, and a stored profile preference takes precedence over the global preference.

`System` follows `prefers-color-scheme` and subscribes to operating-system changes only while active. The synchronous theme bootstrap runs before the application module and reads an internal active-session hint before the anonymous global preference, so a restored profile's preference keeps profile-over-global precedence before paint. It applies the resolved root class and synchronizes browser `theme-color` with `#FCFAF6` or the dark canvas `#121110`. Failed restoration and logout clear the hint and restore the anonymous preference without changing it.

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

Run `npm run design:catalog` and open `/design-system.html` to inspect light and dark component states at responsive widths. The catalog includes page-return navigation, theme-toggle, code-surface, segmented-tab, search-only, single-filter and multi-filter discovery bars, compact-control, and lifecycle-action examples. It is a development entrypoint and is not registered in the production application router or included as a production build entry.

`npm run design:check` runs in normal and CI validation. It rejects native select, checkbox, and radio controls outside the primitives; custom switches; the retired `accent` button intent; activation buttons outside reviewed workflow contexts; component-local literal colors; every standard named Tailwind palette; `backdrop-blur`; copied route-shell signatures; and authenticated route pages without shared composition or a documented embedded exception. Raw buttons must use one of the tested shared sizing helpers or the canonical responsive `control-target` utility. The explicit 40 px desktop-sidebar navigation row is the sole desktop-only target exception.

## Ownership

The management-console repository owns these components, tokens, catalog snapshots, exception review, and migration documentation. Feature owners supply semantic content and preserve route and control-plane behavior. Changes to shared primitives require component tests, accessibility evidence, catalog coverage, and `npm run design:check`.
