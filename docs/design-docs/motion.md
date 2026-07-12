# Focused Application Motion

Motion in the management console explains continuity between visible states. It must remain quick, interruptible, and subordinate to operational data.

## Vocabulary

### Theme reveal

Theme changes begin at the control the operator clicked. Supported browsers reveal the new theme with a 320 ms radial View Transition using the console's ease-out-quint curve. The clicked sun or moon control is isolated for the snapshot and crosses state with a restrained 160 ms rotate and scale transition.

The same interaction applies to the login control, desktop account menu, and mobile navigation. A rapid repeated click skips the active transition before starting the next one. The login illustration pauses during snapshot capture. Reduced-motion users and browsers without View Transitions receive the preference change immediately.

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
