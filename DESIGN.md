---
name: "AcornOps Management Console"
description: "A restrained operational console for inspecting platform state and making traceable changes."
colors:
  signal-orange: "oklch(0.712 0.187 39.7)"
  signal-orange-strong: "oklch(0.651 0.179 38.9)"
  signal-orange-bright: "oklch(0.755 0.154 42.2)"
  signal-orange-soft: "oklch(0.96 0.035 52)"
  warm-canvas: "oklch(0.985 0.006 85)"
  paper-surface: "oklch(0.996 0.004 85)"
  pressed-surface: "oklch(0.962 0.012 74)"
  warm-border: "oklch(0.925 0.012 74)"
  ink-text: "oklch(0.3 0.008 72)"
  muted-ink: "oklch(0.54 0.025 54)"
  metric-blue: "oklch(0.52 0.085 244)"
  code-night: "oklch(0.225 0.02 250)"
  success: "oklch(0.52 0.13 160)"
  success-soft: "oklch(0.96 0.03 160)"
  warning: "oklch(0.58 0.115 105)"
  warning-soft: "oklch(0.955 0.035 108)"
  danger: "oklch(0.54 0.18 20)"
  danger-soft: "oklch(0.96 0.035 20)"
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
  body:
    fontFamily: "Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5rem"
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
components:
  button-primary:
    backgroundColor: "{colors.ink-text}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-accent:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  search-field:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    height: "44px"
  status-chip:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  surface-card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: AcornOps Management Console

## 1. Overview

**Creative North Star: "The Operator's Ledger"**

The AcornOps Management Console is a product interface for operators and developers who need to inspect workspace state, trace execution, and make deliberate changes without losing context. The visual system should feel like a ledger: warm, orderly, precise, and built for repeated reading under pressure.

The system is restrained by design. Warm neutral surfaces carry most of the experience, orange appears only when the interface needs a signal, and dense operational surfaces stay readable through hierarchy, spacing, borders, and stable component behavior. It rejects decorative SaaS patterns, route-breaking cleverness, opaque local state, direct backend calls outside the control-plane client boundary, and visual treatments that compete with diagnostics or trace readability.

**Key Characteristics:**
- Warm neutral shell with one controlled orange signal.
- Dense but readable pages for repeated operational scanning.
- Familiar product controls with predictable keyboard and focus behavior.
- Borders and tonal layers before shadow.
- Motion only when it explains state.

## 2. Colors

The palette is warm, inspectable, and intentionally quiet. The canonical source is `src/styles.css`, using OKLCH tokens with RGB mirrors for Tailwind alpha utilities.

### Primary
- **Controlled Signal Orange** (`signal-orange`): Used for focus rings, selected state, hover accents, scroll thumbs, and activation moments. Filled orange buttons are reserved for workflow launch or activation.
- **Strong Signal Orange** (`signal-orange-strong`): Used for icons and text when an orange element needs readable contrast without filling the surface.
- **Soft Signal Wash** (`signal-orange-soft`): Used for selected, hover, and low-pressure accent backgrounds.

### Secondary
- **Metric Blue** (`metric-blue`): Used for chart contrast and comparative metrics only. It is not a second brand accent.

### Tertiary
- **Semantic Green, Ochre, and Red** (`success`, `warning`, `danger`): Used only for status, warnings, and destructive states. Every semantic color has a soft background companion.

### Neutral
- **Warm Canvas** (`warm-canvas`): The route background and main app shell.
- **Paper Surface** (`paper-surface`): Cards, panels, dialogs, controls, and content surfaces.
- **Pressed Surface** (`pressed-surface`): Stronger neutral layer for active, inset, or grouped surfaces.
- **Warm Border** (`warm-border`): The default structural divider.
- **Ink Text** (`ink-text`): Primary text.
- **Muted Ink** (`muted-ink`): Helper text, metadata, quiet labels.
- **Code Night** (`code-night`): Code and terminal-style surfaces.

### Named Rules

**The Single Signal Rule.** Orange is the only primary accent. If a screen needs another loud hue, it must be semantic status or data visualization.

**The Warm Neutral Rule.** Backgrounds and borders stay warm and quiet. Do not introduce cool slate, blue-gray, or generic dashboard neutrals.

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
- **Row Title** (600, `0.875rem`, `1.25rem`): List items, resource names, table-leading labels.
- **Body** (400, `0.875rem`, `1.5rem`): Descriptions and explanatory copy, capped around 65 to 75 characters when prose is not tabular.
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
- **Evidence Card Lift** (`0 12px 28px rgb(var(--text-rgb) / 0.08)`): Login evidence illustration surfaces and other rare demonstration surfaces.
- **Focus Ring** (`0 0 0 2px rgb(var(--brand-orange-rgb) / 0.20 to 0.25)`): Keyboard focus and focused fields.

### Named Rules

**The Border Before Shadow Rule.** Use borders and tonal layers before adding elevation. If a shadow is visible before the border is readable, the shadow is too strong.

**The No Glass Rule.** Blur-backed panels and glass cards are prohibited for this product.

## 5. Components

### Buttons

Buttons are compact, predictable, and text-led. They use lucide icons when an icon clarifies the command.

- **Shape:** Gently curved rectangles (`6px`).
- **Primary:** Filled neutral, near-ink background with paper text. Use for the strongest action on a utilitarian screen.
- **Accent:** Controlled orange fill for activation moments only.
- **Secondary:** Paper surface, warm border, ink text, small shadow.
- **Tertiary / Ghost:** Text-muted default, soft orange wash on hover.
- **Hover / Focus:** Color and border transitions at about `200ms`; focus uses a visible orange ring.

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

### Inputs / Fields

Inputs are quiet and stable.

- **Style:** Warm border, paper or canvas fill, `8px` radius for search fields and `6px` to `8px` for form fields.
- **Focus:** Orange ring or border shift, never a heavy glow.
- **Error / Disabled:** Semantic text and soft semantic backgrounds; disabled uses opacity plus cursor change.

### Navigation

Navigation is familiar product chrome: desktop sidebar, mobile top navigation, route-stable links, and compact context switchers.

- **Default:** Muted text on neutral surfaces.
- **Hover:** Soft orange wash and stronger orange text.
- **Active:** Clear selected state with text, background, and sometimes a badge. Do not rely on color alone.
- **Mobile:** Use standard dialog/drawer patterns with focus trapping and explicit close controls.

### Dialogs and Drawers

Dialogs are reserved for confirmation, replacement invites, credential display, and focused create flows.

- **Shape:** `12px` for dialog panels, `8px` to `12px` for drawer surfaces.
- **Overlay:** Text-color scrim in light mode, darker bg scrim in dark mode.
- **Motion:** Framer Motion state transitions only. No page-load choreography.
- **Focus:** Initial focus and focus wrap are required.

## 6. Do's and Don'ts

### Do:
- **Do** keep the console control-plane-backed: parse and normalize API payloads at the client boundary before UI use.
- **Do** protect route stability: workspace, Kubernetes cluster, VM, and tab links must remain shareable.
- **Do** prioritize trace readability and operational scan speed over local cleverness.
- **Do** use predictable controls, visible labels, visible focus states, and stable dimensions.
- **Do** reserve orange for actions, selected state, focus, and meaningful state.
- **Do** keep dense pages readable through borders, spacing rhythm, typography, and progressive disclosure.
- **Do** respect reduced-motion preferences.

### Don't:
- **Don't** use decorative SaaS patterns.
- **Don't** use route-breaking cleverness.
- **Don't** use opaque local state abstractions that hide control-plane state.
- **Don't** make direct backend calls outside the control-plane client boundary.
- **Don't** use visual treatments that compete with diagnostics or trace readability.
- **Don't** use orange as a generic accent; reserve orange filled buttons for workflow launch or activation.
- **Don't** use glassmorphism, gradient text, decorative bokeh, or ornamental orbs.
- **Don't** use `border-left` or `border-right` wider than `1px` as a colored accent on cards, list items, callouts, or alerts.
- **Don't** make status, role, permission, or health depend on color alone.
