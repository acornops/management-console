# `@acornops/ui`

Private, domain-neutral React components and design foundations extracted from
the AcornOps Management Console.

Import the component API and global foundations separately:

```ts
import { Button, PageShell } from '@acornops/ui';
import '@acornops/ui/fonts';
import '@acornops/ui/tokens.css';
```

Tailwind consumers should add `@acornops/ui/tailwind-preset` to their presets
and include the package distribution in their content globs.

The package deliberately does not own routes, API clients, authentication,
translations, target models, or product-specific status components.

Application code composes menus through `ActionMenu`, or `MenuSurface` when a
feature owns reviewed placement or motion. `useFloatingActionMenu` is a
package-level implementation hook and is not an application API. Autocomplete
features retain query, loading, token, and selection state while composing
`ComboboxListbox`, `ComboboxGroup`, and `ComboboxOption` for roles and visual
behavior. `SegmentedTabs` owns tab DOM and keyboard behavior, including
per-item `controlsId` relationships.

Use `InlineAlert` for bordered semantic feedback and `StatusBadge` for compact
or default semantic labels. Navigation counters and input tokens remain
separate patterns.

Use `IconTile` for flat, non-interactive context glyphs. Neutral tiles use a
quiet ink tint, identity tiles may retain an accent-colored glyph, and semantic
tiles use the matching status-soft treatment. Icon actions must use `Button`
with the `icon` or `dangerIcon` variant so hover, focus, disabled, and target
behavior remain explicit.

Use `DateTimePicker` when a product flow needs date-and-time selection. It
keeps the calendar, time fields, focus treatment, keyboard navigation, and
theme behavior inside the shared control vocabulary instead of exposing
browser-specific `datetime-local` chrome.

`EmptyState` uses one quiet presentation everywhere: a compact neutral icon
tile, title, description, and optional supporting content. It does not add its
own frame or accent treatment. The legacy `embedded` prop remains accepted for
source compatibility but does not change the rendered result.
