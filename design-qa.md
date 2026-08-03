# Account Menu Option 3 Design QA

## Evidence

- Source visual truth: `/home/ning/.codex/generated_images/019fc6a6-60aa-7601-96f9-6fd85809bda2/exec-9918a1ec-0cab-429c-84fe-040260dde4a7.png`
- Browser implementation, light: `/tmp/acorn-account-panel-option3-light.png`
- Browser implementation, theme submenu open: `/tmp/acorn-account-panel-option3-theme-open.png`
- Browser implementation, dark: `/tmp/acorn-account-panel-option3-dark.png`
- Side-by-side comparison: `/tmp/acorn-account-panel-option3-comparison.png`
- Browser viewport: `1440 x 1000` CSS pixels at device scale factor `1`
- Source pixels: `1254 x 1254`
- Light and dark implementation crops: `239 x 229` pixels
- Theme submenu crop: `430 x 258` pixels
- Comparison canvas: `960 x 560` pixels. The implementation crop was enlarged proportionally to match the source component's displayed width; neither artifact was stretched.
- State: authenticated expanded desktop sidebar with the account menu open. Theme submenu, dark appearance, and Escape dismissal were also tested.

## Required Fidelity Surfaces

- Fonts and typography: the browser resolves the existing Outfit product font. Menu labels use the shared UI role, the theme value uses the caption role, and the trigger retains the stronger name plus secondary email hierarchy.
- Spacing and layout rhythm: the panel and trigger both render at `223px` wide. The panel is `151px` high with two compact preference rows, a structural divider, and one Logout row. The trigger remains `54px` high with an `8px` panel gap.
- Colors and visual tokens: the panel uses the paper surface and warm structural border. The corrected open trigger resolves to `rgb(252, 250, 246)` with ink text `rgb(48, 45, 41)`, avoiding the tertiary accent wash. Dark mode uses the corresponding theme tokens.
- Image quality and asset fidelity: no raster product asset is required. The component uses the repository's existing Lucide-based icon set, which matches the selected line-icon direction and stays sharp at the rendered size.
- Copy and content: the panel contains only `Account Settings`, `Theme`, the selected theme value, and `Logout`. The user's identity and email appear once in the trigger and are not repeated in the panel. The browser fixture uses `Test User`; production continues to show the authenticated user's actual identity.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- P3: the generated target includes a small pointer between the panel and trigger. The implementation intentionally keeps the existing AcornOps floating-panel anatomy without a decorative CSS or custom-SVG pointer.
- P3: the implementation uses the product's canonical compact row heights rather than the generated image's enlarged presentation scale.

## Interaction Evidence

- The account trigger opens the action-only panel and exposes correct menu semantics.
- The Theme row opens its radio-menu submenu; selecting Dark updates the theme and visible value.
- Escape closes the account panel, restores focus to the trigger, and returns `aria-expanded` to `false`.
- Panel and trigger widths remain aligned after the open transition completes.
- No browser console or page errors were observed.

## Comparison History

- Initial comparison found a P2 state-color mismatch: hovering the open trigger inherited the tertiary button's peach accent wash and orange text, while the selected target used a quiet neutral open state.
- Fix: the active/open class now explicitly preserves `bg-ui-bg` and `text-ui-text` during hover.
- Post-fix evidence: `/tmp/acorn-account-panel-option3-light.png` and `/tmp/acorn-account-panel-option3-comparison.png` show the neutral open state; computed browser colors confirm the canvas and ink tokens.
- No other P0, P1, or P2 differences were found in the post-fix comparison.

## Implementation Checklist

- [x] Remove the repeated account identity header from the panel.
- [x] Keep Account Settings and Theme in one compact action group.
- [x] Separate Logout with one structural divider.
- [x] Reduce the floating panel shadow to the small structural token.
- [x] Preserve the email in the trigger.
- [x] Preserve theme selection, keyboard dismissal, focus restoration, and dark mode.

final result: passed
