---
name: "AcornOps Management Console"
description: "A restrained operational console for inspecting platform state and making traceable changes."
colors:
  signal-orange: "oklch(0.712 0.187 39.7)"
  signal-orange-strong: "oklch(0.651 0.179 38.9)"
  signal-orange-bright: "oklch(0.755 0.154 42.2)"
  signal-orange-readable: "oklch(0.48 0.145 38.9)"
  signal-orange-soft: "oklch(0.96 0.035 52)"
  warm-canvas: "oklch(0.985 0.006 85)"
  paper-surface: "oklch(0.996 0.004 85)"
  pressed-surface: "oklch(0.962 0.012 74)"
  warm-border: "oklch(0.925 0.012 74)"
  ink-text: "oklch(0.3 0.008 72)"
  muted-ink: "oklch(0.54 0.025 54)"
  metric-blue: "oklch(0.52 0.085 244)"
  code-night: "oklch(0.225 0.02 250)"
  code-text: "oklch(0.94 0.008 80)"
  success: "oklch(0.52 0.13 160)"
  success-soft: "oklch(0.96 0.03 160)"
  success-text: "oklch(0.4 0.12 160)"
  warning: "oklch(0.58 0.115 105)"
  warning-soft: "oklch(0.955 0.035 108)"
  warning-text: "oklch(0.37 0.095 105)"
  danger: "oklch(0.54 0.18 20)"
  danger-soft: "oklch(0.96 0.035 20)"
  danger-text: "oklch(0.45 0.16 20)"
  logo-brown: "oklch(0.43 0.026 61)"
  logo-cream: "oklch(0.95 0.012 86)"
  brand-brown-dark: "oklch(0.278 0.03 250)"
typography:
  display:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "0"
  headline:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "0"
  title:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "0"
  data:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "0"
  body:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  ui:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "0"
  caption:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 450
    lineHeight: "1.25rem"
  label:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.04em"
  code:
    fontFamily: "Ubuntu Mono, ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "0.8125rem"
    lineHeight: "1.25rem"
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  route-x: "40px"
  route-y: "32px"
  header-content: "32px"
  section: "32px"
  surface: "20px"
  row-y: "14px"
  control-compact: "36px"
  control-default: "44px"
  overlay-x: "24px"
  overlay-y: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink-text}"
    textColor: "{colors.warm-canvas}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-activation:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.logo-cream}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  search-field:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    height: "44px"
  status-chip:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  surface-card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    padding: "16px"
  navigation-item:
    backgroundColor: "{colors.warm-canvas}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.sm}"
    height: "40px"
  segmented-tab-active:
    textColor: "{colors.signal-orange-strong}"
    padding: "8px 12px"
    height: "44px"
---

# Design System: AcornOps Management Console

## 1. Overview

**Creative North Star: "The Operator's Ledger"**

The AcornOps Management Console is a product interface for operators and developers who need to inspect workspace state, trace execution, and make deliberate changes without losing context. The visual system should feel like a ledger: warm, orderly, precise, and built for repeated reading under pressure.

The system is restrained by design. Warm neutral surfaces carry most of the experience, orange appears only when the interface needs a signal, and dense operational surfaces stay readable through hierarchy, spacing, borders, and stable component behavior. It rejects decorative SaaS patterns, route-breaking cleverness, opaque local state, direct backend calls outside the control-plane client boundary, and visual treatments that compete with diagnostics or trace readability.

The ledger reads in two lights. A light theme and a dark theme share one warm hue family and one orange signal, both expressed entirely through design tokens, so the same operator can work in a bright room or a dim one without the interface changing character.

**Key Characteristics:**
- Warm neutral shell with one controlled orange signal.
- Dense but readable pages for repeated operational scanning.
- Familiar product controls with predictable keyboard and focus behavior.
- Route-stable navigation that changes structure, not meaning, across breakpoints.
- Borders and tonal layers before shadow.
- Motion only when it explains state.
- Dual light and dark themes, driven entirely by design tokens.

## 2. Colors

The palette is warm, inspectable, and intentionally quiet. The canonical source is `src/styles.css`, using OKLCH tokens with RGB mirrors for Tailwind alpha utilities.

### Primary
- **Controlled Signal Orange** (`signal-orange`): Used for focus rings, selected state, hover accents, and activation moments. Filled orange buttons are reserved for workflow launch or activation.
- **Strong Signal Orange** (`signal-orange-strong`): Used for icons and text when an orange element needs readable contrast without filling the surface.
- **Readable Signal Orange** (`signal-orange-readable`): Used only when orange text must meet contrast on light surfaces, such as the wordmark.
- **Soft Signal Wash** (`signal-orange-soft`): Used for selected, hover, and low-pressure accent backgrounds.

### Secondary
- **Metric Blue** (`metric-blue`): Used for chart contrast and comparative metrics only. It is not a second brand accent.

### Tertiary
- **Semantic Green, Ochre, and Red** (`success`, `warning`, `danger`): Used only for status, warnings, and destructive states. Every semantic color has a soft background companion (`success-soft`, `warning-soft`, `danger-soft`) and a darker readable text companion (`success-text`, `warning-text`, `danger-text`) for legible label text on the soft fill.

### Neutral
- **Warm Canvas** (`warm-canvas`): The route background and main app shell.
- **Paper Surface** (`paper-surface`): Cards, panels, dialogs, controls, and content surfaces.
- **Pressed Surface** (`pressed-surface`): Stronger neutral layer for active, inset, or grouped surfaces.
- **Warm Border** (`warm-border`): The default structural divider.
- **Ink Text** (`ink-text`): Primary text.
- **Muted Ink** (`muted-ink`): Helper text, metadata, quiet labels, and the scoped scrollbar thumb used by intentional console scroll regions.
- **Code Night** (`code-night`): Code and terminal-style surfaces.
- **Code Text** (`code-text`): The shared warm, high-contrast foreground for code, logs, and terminal-style surfaces in both themes.

### Brand & Illustration
- **Logo Brown** (`logo-brown`) and **Logo Cream** (`logo-cream`): The acorn mark and wordmark only. They are brand-asset colors, never used for UI surfaces or body text.
- **Deep Brown-Navy** (`brand-brown-dark`): A single cool anchor reserved for specific brand and illustration fills. It is the one sanctioned exception to the Warm Neutral Rule and must never leak into UI chrome.

### Dual Theme

The console ships `System`, `Light`, and `Dark` preferences. `System` resolves through `prefers-color-scheme`; the resolved appearance controls the root `dark` class (`darkMode: 'class'`). A missing or invalid stored preference becomes `System`, while stored `Light` and `Dark` values remain valid. Authenticated profile preferences override the global preference when present.

Both themes are defined as OKLCH tokens in `:root` and `.dark` within `src/styles.css`, each mirrored to an `-rgb` triple so Tailwind alpha utilities resolve in either theme. The docs-derived dark neutral ramp is:

- Canvas `#121110`, `oklch(0.178407 0.002613 67.659)`.
- Surface `#1E1A18`, `oklch(0.221666 0.007407 48.368)`.
- Strong surface `#2D2827`, `oklch(0.281925 0.007660 31.115)`.
- Structural border `#464140`, `oklch(0.379934 0.007070 31.086)`.
- Text `#F5F1EF`, `oklch(0.960674 0.005080 48.686)`.
- Muted text `#A6A1A0`, `oklch(0.712881 0.005998 31.059)`.
- Interactive boundary `#777371`, `oklch(0.558455 0.005830 48.624)`.

The shared theme menu appears on login and authenticated desktop and mobile navigation. It uses Monitor, Sun, and Moon options with radio-menu semantics and complete keyboard focus behavior. Every trigger shows the destination appearance with a `160ms` opacity, rotate, and scale swap using the ease-out-quint curve. A user choice that changes the resolved appearance recolors in place and adds a `320ms` click-origin ripple. Choosing `System` when it already matches the visible appearance updates only the stored preference. Later operating-system changes under `System` switch without a click-origin ripple. Reduced-motion users receive every change immediately.

### Named Rules

**The Single Signal Rule.** Orange is the only primary accent. If a screen needs another loud hue, it must be semantic status or data visualization.

**The Warm Neutral Rule.** Backgrounds and borders stay warm and quiet. Do not introduce cool slate, blue-gray, or generic dashboard neutrals. The one sanctioned cool token is `brand-brown-dark`, and only for brand illustration.

**The Token Theme Rule.** Never hardcode a color. Every surface, text, border, and status color resolves through a design token so it adapts across the light and dark themes. A literal hex or RGB in a component is a defect.

**The Activation Rule.** Orange filled buttons are for workflow launch or activation. Routine product actions use neutral primary or secondary buttons.

## 3. Typography

**Display Font:** Outfit with system sans fallbacks.
**Body Font:** Outfit with system sans fallbacks.
**Label/Mono Font:** Ubuntu Mono for code and token-like values.

**Character:** The type system is utilitarian and measured. It uses weight, muted color, and small fixed steps to create hierarchy without marketing-scale drama.

### Hierarchy
- **Display** (600, `1.875rem`, `2.25rem`): Route titles and major route headers.
- **Headline** (600, `1.25rem`, `1.75rem`): Selected detail headers and major section titles.
- **Title** (600, `1rem`, `1.5rem`): Panel headings.
- **Data** (600, `1.25rem`, `1.75rem`, tabular lining numerals): Metric and count readouts. Uses `font-variant-numeric: tabular-nums lining-nums` so figures align in columns.
- **Row Title** (600, `0.875rem`, `1.25rem`): List items, resource names, table-leading labels.
- **Body** (400, `0.875rem`, `1.5rem`): Descriptions and explanatory copy, capped around 65 to 75 characters when prose is not tabular.
- **UI Text** (500, `0.875rem`, `1.25rem`): Interactive control text: buttons, tabs, menu items, and inline actions.
- **Caption** (450, `0.75rem`, `1.25rem`): Quiet secondary captions and helper text where the uppercase Label style would read too loud.
- **Label** (600, `0.75rem`, `0.04em`, uppercase): Compact labels, metadata headings, and form field labels.
- **Micro Label** (600, `0.6875rem`, `0.055em`, uppercase): Dense operational labels and small panel metadata.
- **Code** (Ubuntu Mono, `0.8125rem`, `1.25rem`): IDs, paths, commands, tokens, and values that need tabular reading.

### Named Rules

**The No Display Drama Rule.** Display type is for route identity, not marketing. Do not add oversized hero typography inside operational pages.

**The Weight-First Rule.** Use font weight and muted color before adding new type sizes. New ad-hoc sizes should be rare.

## 4. Elevation

The console is flat by default. Depth comes from warm surfaces, borders, and layout rhythm first; shadows are small structural cues on buttons, cards, dialogs, and floating panels. Tonal contrast should remain readable without depending on shadow.

### Shadow Vocabulary
- **Subtle Surface** (`shadow-sm`, approximately `0 1px 2px rgb(0 0 0 / 0.05)`): Cards, secondary buttons, small panels.
- **Dialog Lift** (`shadow-2xl`): Modal and drawer panels only.
- **Focus Ring** (`0 0 0 2px rgb(var(--brand-orange-rgb) / 0.15 to 0.25)`): Keyboard focus and focused fields.

### Named Rules

**The Border Before Shadow Rule.** Use borders and tonal layers before adding elevation. If a shadow is visible before the border is readable, the shadow is too strong.

**The No Glass Rule.** Blur-backed panels and glass cards are prohibited for this product.

## 5. Components

### Buttons

Buttons are compact, predictable, and text-led. They use lucide icons when an icon clarifies the command.

- **Shape:** Gently curved rectangles (`6px`).
- **Primary:** Filled neutral, near-ink background with canvas text. Use for the strongest action on a utilitarian screen.
- **Dark Primary:** Strong warm-neutral fill with light text. Never invert the page background and text tokens to construct a button.
- **Activation:** Canonical signal-orange fill with light logo-cream text for workflow launch and activation moments only. The same AcornOps orange is used in both themes, and the fill provides its own boundary without a permanent dark outline or stacked shadow. This user-directed brand pairing is an explicit contrast exception and must not be generalized to routine controls. Create, Add, Invite, Save, Continue, and routine Run actions use neutral Primary.
- **Secondary:** Paper surface, interactive boundary, ink text, small shadow. Dark mode uses a warm dark surface with light text.
- **Danger:** Semantic destructive fill. Dark mode uses `#A92C3C` with light text.
- **Tertiary / Ghost:** Text-muted default, soft orange wash on hover.
- **Sizing:** Default controls are at least `44px` high; compact controls may reduce to `36px` from the `sm` breakpoint upward.
- **Hover / Focus / Disabled:** Enabled foreground and fill pairs meet WCAG 2.1 AA normal-text contrast. Interactive and focus boundaries use the semantic boundary token where 3:1 non-text contrast is required. Disabled controls keep their dimensions, reduce to `50%` opacity, and use a not-allowed cursor.

### Route composition and spacing

Authenticated routes compose through `PageShell`, `PageBackLink`, and `PageHeader`. `PageShell` owns scrolling, responsive route margins, width constraints, and embedded mode. When a route needs an explicit return destination, `PageBackLink` renders immediately before `PageHeader` and owns the left-chevron icon, typography, target height, hover treatment, and focus boundary. Route-level Back navigation is never restyled as a header action. `PageHeader` owns route title hierarchy, description width, context or breadcrumbs, action wrapping, and responsive alignment.

The canonical rhythm is token-driven:

- Route padding: `16px / 24px` on mobile, `24px / 24px` from `sm`, and `40px / 32px` from `lg`.
- Header-to-content gap: `32px`.
- Section gap: `24px` on compact viewports and `32px` from `lg`.
- Surface padding: `16px` on mobile and `20px` from `sm`.
- Dense table row vertical padding: `14px`.
- Controls: `44px` by default; `36px` compact controls only from `sm` upward.
- Dialog and drawer padding: `20px / 16px` on compact viewports and `24px / 20px` from `lg`.

Individual pages retain information architecture suited to the task. Split panes, resource explorers, chat transcripts, metric layouts, and tables may differ. Route chrome, title hierarchy, action semantics, control behavior, state treatment, spacing tokens, and overlay anatomy do not differ. Embedded surfaces must be documented in `scripts/design-system-exceptions.json` and still use shared controls and state patterns.

Workflows and MCP Catalog use the shared catalog split. One bordered surface contains a divided library and detail pane with a `32rem` minimum height. At `lg` and wider, the library uses `minmax(18rem, 22rem)` and detail fills the remaining width. Below `lg`, only the route-selected pane is visible; detail provides a Back action that returns to the library and restores focus to its selected row. Desktop may preview the first visible item without writing selection state to the URL. Shared primitives also own list headers, row padding and selection, loading and empty states, detail headers, detail-body padding and tone, and the discovery-to-surface gap. Page-specific filters, metadata, actions, tabs, and detail fields remain feature-owned.

### Chips

Chips are status labels, not decoration.

- **Style:** Rounded pill or compact rounded badge, uppercase, high-weight small text.
- **State:** Success, warning, danger, and neutral use semantic soft backgrounds with readable semantic text.
- **Rule:** Status meaning must be readable from text, not color alone.

### Cards / Containers

Cards are used for repeated items, dialogs, framed tools, and list groups. Page sections should remain unframed unless the border improves scanning.

- **Corner Style:** `8px` for cards and panels, `12px` for larger invitation/dialog surfaces.
- **Background:** Paper surface on warm canvas, pressed surface for selected or inset areas.
- **Shadow Strategy:** `shadow-sm` only when the card must separate from a similarly colored surface.
- **Border:** Warm border is the primary container boundary.
- **Internal Padding:** Usually `16px` to `20px`; dense rows can use `12px`.
- **Interactive State:** Hover and focus-within may strengthen the border with a low-opacity orange and lift the surface tonally. Do not add a larger shadow.

### Empty states

Route-level collections use the shared `EmptyState` component. Standalone states
open with a small layered-paper illustration that recalls the operator's ledger,
then use an optional context label, panel-title heading, body description with a
restrained reading measure, optional teaching detail, and an action row separated
by the canonical `24px` gap. The layered paper remains neutral and static while
its framed glyph uses the strong signal-orange text token to mark the available
setup path; it never implies activity. Standalone collection
states use one dashed warm-border frame with a `12rem` minimum height. Tables,
queues, and master-detail panes use the embedded surface mode with the compact
`40px` icon tile so the same anatomy sits inside the existing boundary without
creating nested cards.

Genuinely empty inventory and filtered no-results states share the component but
keep distinct copy and icons. Route-header creation actions are not duplicated in
the empty state; a state-local action is reserved for recovery or for a full-page
setup state with no route header. Compact field absences such as no run history or
no assigned capabilities remain inline text rather than expanding into a
collection empty state.

### Inputs / Fields

Inputs are quiet and stable.

- **Style:** Warm border, paper fill, `8px` radius, subtle inset highlight, and a stable `44px` minimum height.
- **Hover / Focus:** Hover strengthens the orange border to `25%`; focus uses a `45%` border and a `15%` two-pixel ring, never a heavy glow.
- **Error / Disabled:** Invalid fields use danger border and soft danger fill; disabled fields retain layout, reduce to `60%` opacity, and use a not-allowed cursor.

### Navigation

Navigation is familiar product chrome driven by one route model. Workspace destinations are grouped as inventory, automation, governance, and utilities, with permission-aware omissions. Workspace, target, workflow, and settings destinations remain real links so copy, open-in-new-tab, and browser history continue to work.

- **Desktop (`1024px` and wider):** A fixed `256px` sidebar uses `40px` rows, `6px` corners, muted text, and grouped section labels. Hover shifts to the canvas surface and stronger ink. Active rows use the same canvas surface, semibold ink, an orange icon, `aria-current`, and an optional count badge. Overflow remains wheel-, touch-, and keyboard-scrollable without displaying a scrollbar.
- **Mobile (below `1024px`):** A `64px` top bar opens a bounded dialog navigation panel. The panel preserves the desktop groups and destinations, traps focus, exposes an explicit close control, returns focus to the trigger, and keeps overflow scrollable without visible scrollbar chrome.
- **State:** Focus uses the standard orange ring. Press feedback may scale to `0.98`; it becomes instant under reduced motion. Status and approval counts reserve stable space when their appearance would otherwise shift labels.

### Tabs and Filters

Tabs and filters share the canonical compact-control vocabulary rather than page-local pills.

- **Tabs:** At least `44px` high, text-led, horizontally scrollable when needed without displaying a scrollbar, and keyboard navigable with arrow, Home, and End keys. The active tab uses stronger orange text plus a shared `2px` orange indicator that slides in `200ms` with the standard ease-out-quint curve and snaps instantly under reduced motion.
- **Top-level discovery:** Collection pages use `DiscoveryFilterBar` with a labeled `PageSearchInput`, zero or more typed filter-group definitions created by `createDiscoveryFilterGroup`, and a polite result summary. `DiscoveryFilterBar` and nested resource search both compose `SearchFilterFrame`, the canonical bordered paper surface with `16px` padding, a restrained shadow, `12px` gaps, and stable `44px` controls. Search is the dominant flexible field while categorical controls stay approximately `11rem` to `14rem` wide.
- **Visible discovery filters:** Typed categorical groups render as always-visible shared `Select` controls. Clusters, virtual machines, and agents expose Status; MCP Catalog exposes Source and Compatibility; Workflows uses the search-only composition. Stable option counts appear inside the select when supplied. Below `sm`, search, selects, trailing actions, and the result summary stack full-width. From `sm` to below `lg`, search owns the first row while multiple selects share equal columns. At `lg` and wider, the toolbar settles into one balanced row without overflow.
- **Discovery clearing:** Search clear and Escape remove only the query and retain search focus. Choosing a default select option clears only that categorical condition. Clear all appears at two or more active conditions, counting the query and every non-default group; it clears the complete route-backed discovery state atomically and restores search focus. The bar is hidden for a genuinely empty, unfiltered collection and remains visible when active filters produce no matches.
- **Nested filters:** Dense resource explorers may use local filter controls when their density or hierarchy differs from top-level collection discovery. Categorical top-level filters use selects, not toggle rows or filled pills.

### Dialogs and Drawers

Dialogs are reserved for confirmation, replacement invites, credential display, and focused create flows.

- **Shape:** `12px` for dialog panels, `8px` to `12px` for drawer surfaces.
- **Overlay:** Text-color scrim in light mode, darker bg scrim in dark mode.
- **Motion:** Framer Motion state transitions only. No page-load choreography. Reduced-motion variants complete in `0.01s` or immediately.
- **Focus:** Initial focus and focus wrap are required.

### Status & Signal Motion

Motion is a state channel, never decoration. A small vocabulary of functional indicators lives in `src/styles.css`, each with a reduced-motion fallback:

- **Thinking Acorn** (`thinking-acorn`): The rolling acorn indicator shown while an agent or session is working.
- **Reasoning Sheen** (`reasoning-summary-active`): A slow orange sheen swept across reasoning-summary text while a model is actively reasoning. This is the single sanctioned use of animated `background-clip: text`; it signals live reasoning state and falls back to solid `currentColor` under reduced motion. It is not decorative gradient text and does not license gradient text anywhere else.
- **Loading Sweep** (`loading-bar-sweep`): An indeterminate progress sweep for pending loads.
- **Pending Step Pulse** (`pending-agent-step-pulse`): A soft warning-tinted ring pulse marking a pending step in a run trace.
- **Theme Reveal** (`theme-reveal`): A `320ms` non-occluding radial ripple originating at the selected theme option. The live page recolors in place, so operational and illustration motion is never snapshotted. Preference changes with the same resolved appearance and operating-system changes under `System` do not add a ripple. Reduced-motion users switch instantly.
- **Active Tab Indicator** (`active-tab-indicator`): A shared `2px` underline that moves between related tabs in `200ms`; reduced motion removes the travel.

### Login Brand Illustration

The desktop login surface may carry the themed “Squirrel Chasing Acorns” operational story: a squirrel follows evidence through Observe, Correlate, and Resolve cards. This is the one reusable permission for ambient brand motion. It appears only on the unauthenticated brand surface at `1024px` and wider, uses theme and semantic tokens, remains live while the theme recolors in place, and becomes a static composition under reduced motion. Its proportional card geometry, SVG paths, gradients, and local shadow are illustration details, not system tokens or app-component patterns.

### Named Rules

**The Motion Explains State Rule.** Every animation maps to a real state: working, pending, loading, resolving. If an animation would run while nothing is happening, it is decoration and is prohibited. All motion respects `prefers-reduced-motion`.

**The Fresh Data Rule.** Shared-element motion is limited to stable application chrome such as theme controls and active tab indicators. Do not morph routes, list rows, charts, or list-to-detail content because operational data may have changed between states. See [Focused Application Motion](/docs/design-docs/motion.md).

## 6. Do's and Don'ts

### Do:
- **Do** keep the console control-plane-backed: parse and normalize API payloads at the client boundary before UI use.
- **Do** protect route stability: workspace, Kubernetes cluster, VM, and tab links must remain shareable.
- **Do** prioritize trace readability and operational scan speed over local cleverness.
- **Do** use predictable controls, visible labels, visible focus states, and stable dimensions.
- **Do** reserve orange for actions, selected state, focus, and meaningful state.
- **Do** keep dense pages readable through borders, spacing rhythm, typography, and progressive disclosure.
- **Do** drive every color through a design token so both the light and dark themes resolve correctly.
- **Do** respect reduced-motion preferences, and give every functional animation a reduced-motion fallback.

### Don't:
- **Don't** use decorative SaaS patterns.
- **Don't** use route-breaking cleverness.
- **Don't** use opaque local state abstractions that hide control-plane state.
- **Don't** make direct backend calls outside the control-plane client boundary.
- **Don't** use visual treatments that compete with diagnostics or trace readability.
- **Don't** use orange as a generic accent; reserve orange filled buttons for workflow launch or activation.
- **Don't** use glassmorphism, gradient text, decorative bokeh, or ornamental orbs. The only sanctioned animated `background-clip: text` is the reasoning sheen (`reasoning-summary-active`), which signals live reasoning state; never extend it to static or decorative text.
- **Don't** use `border-left` or `border-right` wider than `1px` as a colored accent on cards, list items, callouts, or alerts.
- **Don't** make status, role, permission, or health depend on color alone.
- **Don't** hardcode a hex or RGB color in a component; it breaks the dark theme. Resolve through a token instead.
