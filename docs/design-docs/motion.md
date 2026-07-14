# Focused Application Motion

Motion in the management console explains continuity between visible states. It must remain quick, interruptible, and subordinate to operational data.

## Vocabulary

### Theme reveal

User-selected appearance changes begin at the chosen theme option. The live page recolors in place and a non-occluding 320 ms radial ripple expands from that control with the console's ease-out-quint curve. The implementation does not snapshot the page, so operational content and the login illustration remain live.

The same interaction applies to the shared System, Light, and Dark menu on login, desktop account navigation, and mobile navigation. Each trigger shows the destination appearance with a 160 ms opacity, rotate, and scale swap using the same ease-out-quint curve. A rapid repeated choice removes the active ripple before starting the next one. Reduced-motion users receive the preference change and destination icon immediately.

Selecting `System` when it resolves to the appearance already on screen updates the preference without a ripple. A later `prefers-color-scheme` change while `System` is active also switches immediately without click-origin motion because there was no click to explain. Browser `theme-color` updates with the resolved canvas in every path.

### Active tab continuity

Application tablists use a shared underline indicator scoped to that tablist. The indicator glides to the selected tab in 200 ms with the ease-out-quint curve. It follows pointer and keyboard selection without changing focus management, ARIA state, URL state, disabled behavior, counts, or panel rendering.

Tab content does not animate. The indicator connects the old and new selection while the newly selected operational content remains immediately readable.

## Boundaries

Keep existing drawer, dialog, loading, and sidebar selection motion unchanged unless a separate interaction review identifies a state-communication problem.

Do not add page-level route transitions, list-to-detail morphs, row morphs, chart morphs, or decorative shared-element transitions to operational data views. Those transitions can imply stale continuity where the underlying control-plane data may have changed, compete with diagnostics, and add snapshot cost to dense surfaces.

Every new motion pattern must:

- represent a real state change;
- preserve URL, keyboard, focus, and ARIA behavior;
- provide an immediate reduced-motion path;
- remain replaceable or interruptible during repeated input;
- avoid animating layout properties.
