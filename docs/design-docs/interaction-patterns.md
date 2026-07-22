# Management Console Interaction Patterns

## Scope

This document defines the durable behavioral contract for production management-console collections, overlays, menus, popovers, tables, forms, asynchronous state, mutation feedback, permissions, formatting, internationalization, and icons.

These rules standardize interaction without changing routes, request or response schemas, control-plane capabilities, permission meaning, information architecture, or feature ownership. Feature code continues to own domain values, validation, table columns, row content, route-backed state, and task-specific layouts.

All primitives are internal, repository-owned React components and hooks. Do not add a headless UI, query-cache, form, or data-grid framework to implement these patterns. Query caching, offline support, generic virtualization, and a global form framework require separate proposals. Virtualization additionally requires measured performance evidence.

Incomplete pagination, inaccessible bespoke controls, inconsistent focus behavior, and mutation feedback that leaves the operator uncertain are defects, not intentional behavior.

## Surface selection

Choose an interaction surface by its behavior and lifetime:

| Surface | Standard use |
| --- | --- |
| Inline | Small edits, expansion, validation, and progressive disclosure |
| Popover | Transient non-blocking controls or supplementary content |
| Action menu | Short command or selection lists |
| Modal dialog | Bounded interruption requiring resolution |
| Modal drawer | Create/edit work that benefits from retaining source context |
| Persistent detail panel | Non-blocking inspection while background interaction remains available |
| Full route | Wide, long-lived, multi-section, or shareable work |

Do not nest modal overlays. Durable, shareable, or multi-section work belongs on a route. Existing code, file, and tool-review workbenches may use the restricted dialog workbench size through exact reviewed exceptions.

Persistent prerequisites use inline states inside the affected surface. Empty
surfaces replace unavailable controls with the canonical `EmptyState` anatomy;
surfaces with retained history or records keep that content readable and replace
only the blocked action area with a compact inline state. Do not apply a scrim,
focus trap, `inert`, or modal semantics to a persistent prerequisite. Reserve a
dialog for a transient decision that the user can resolve in the current moment.

## Overlay contract

`DialogFrame` and `DrawerFrame` are the only production modal frames. The lower-level `Dialog` and any side-panel implementation are internal details that feature code does not import.

Use semantic size variants:

| Primitive | Variant | Width |
| --- | --- | --- |
| `DialogFrame` | `confirmation` | `max-w-md` |
| `DialogFrame` | `form` | `max-w-xl` |
| `DialogFrame` | `detail` | `max-w-2xl` |
| `DialogFrame` | `wide` | `max-w-4xl` |
| `DialogFrame` | `workbench` | `max-w-6xl` |
| `DrawerFrame` | `form` | `max-w-xl` |
| `DrawerFrame` | `wide` | `max-w-2xl` |
| `DrawerFrame` | `editor` | `max-w-3xl` |

Dialogs retain safe mobile margins and have a maximum height of `min(90dvh, 52rem)`. Drawers become full-width and full-height on compact viewports. Within either frame, the header and footer remain fixed and only the body scrolls.

Every modal overlay provides:

- Escape, backdrop, and explicit close behavior;
- an intentional initial-focus target;
- focus containment while open;
- focus restoration to the trigger or another meaningful target;
- a stable accessible name and optional description;
- safe compact-viewport and text-expansion behavior.

Closing may be disabled only when interruption of an active mutation would be unsafe. The disabled state applies consistently to the close button, Escape, and backdrop interaction.

Destructive confirmation always uses the `confirmation` dialog. The explanation stays in the body and uses `InlineAlert` when warning emphasis is needed. Production code does not use `window.confirm`.

`DrawerFrame` owns modal side sheets. `PersistentDetailPanel` is a nonmodal layout composition: it leaves background controls available, does not trap focus, and does not expose modal semantics. `RightSidePanel` is retired from the feature import boundary.

Desktop persistent rails may expose a focusable separator when their content benefits from user-controlled width. Keep a documented default, minimum usable width, viewport-capped maximum, and collapse threshold. Dragging below the threshold collapses the rail into its stable navigation trigger; reopening restores the last usable width. Separators support Left and Right Arrow resizing, Home collapse, End maximum, visible focus, and an accessible name. Compact layouts keep their bounded overlay behavior and do not expose desktop resize controls.

## Cursor collections

All paginated service functions return the complete page envelope as `PagedResult<T>`. A client must never discard `nextCursor` by projecting a page directly to `T[]`.

Use the transparent shared collection hook:

```ts
interface CursorCollectionOptions<T, TFilters> {
  filters: TFilters;
  getKey: (item: T) => string;
  loadPage: (request: {
    cursor?: string;
    limit: number;
    filters: TFilters;
    signal: AbortSignal;
  }) => Promise<PagedResult<T>>;
  pageSize: number;
  strategy: 'manual' | 'sentinel' | 'drain';
}

interface CursorCollectionState<T> {
  items: T[];
  nextCursor?: string;
  phase: 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error';
  error?: string;
  loadMore(): Promise<void>;
  refresh(): Promise<void>;
  retry(): Promise<void>;
}
```

Normal collections use a page size of 50. Dense resource explorers may use 100.

- `manual` renders an explicit Load more action.
- `sentinel` loads progressively through the hook's observer and retains a keyboard-accessible Load more fallback.
- `drain` is limited to documented bounded selectors and aggregates. Potentially unbounded inventories remain paginated.

Filter changes abort stale requests and reset items and cursors. Items deduplicate by a stable domain key. A repeated cursor becomes a recoverable error. Load-more failure preserves existing items. Refresh preserves visible data until replacement succeeds.

Appending must preserve focus, scroll position, and route-backed selection. Announce pagination progress politely without announcing the entire collection again.

Maintain a static endpoint inventory that records every paginated service, each frontend consumer, and its chosen strategy. Direct pagination `IntersectionObserver` usage is internal to the collection hook.

## Collection state

Use these shared state names:

```ts
type ResourcePhase = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';
type MutationPhase = 'idle' | 'pending' | 'success' | 'error';
```

`useCursorCollection` adds `loadingMore` where an append request must be distinguished from initial loading and refresh.

`CollectionState` selects the established loading, empty, filtered-empty, and error compositions. Feature code supplies translated copy and retry actions.

`CollectionState` and retained-content `DataSurface` boundaries expose
`aria-busy` during initial load, refresh, and append. Skeleton geometry is
decorative and stays inside an `aria-hidden` wrapper; a single concise status
label carries the loading announcement.

- Initial loading may replace the collection body.
- Refreshing retains visible data and adds restrained progress feedback.
- Loading more retains visible data and keeps current items interactive where safe.
- Empty means the underlying inventory has no items.
- Filtered-empty means items may exist, but none match the active query or filters; include a clear recovery action.
- Error remains inside the collection boundary and includes Retry.
- A failed append keeps already loaded items visible.

The maintained surface and endpoint inventory lives in
[`async-collection-inventory.md`](async-collection-inventory.md). Every entry
records its shared lifecycle owner or a named contextual exception.

## Top-level collection discovery

Top-level collection routes use `DiscoveryFilterBar`; nested resource explorers
may compose the same `SearchFilterFrame` with context-specific controls. The
frame is a bordered paper surface with `16px` padding, a restrained shadow,
`12px` gaps, a dominant flexible search slot, and stable `44px` controls.

Categorical conditions remain visible as shared `Select` controls instead of a
secondary filter popover. Feature code owns typed values, labels, stable option
counts, route parameters, matching, pagination, and `onChange` behavior. Search
and filters stack full-width below `sm`; from `sm` to below `lg`, search owns the
first row and multiple selects share columns; at `lg` and wider, search, selects,
trailing actions, and the polite result summary occupy one balanced row without
overflow. Selects remain approximately `11rem` to `14rem` wide while search
absorbs remaining space.

Search clear and Escape remove only the query and keep search focus. Select
changes return focus to the trigger. Clear all is contextual, clears the complete
route-backed discovery state atomically, and returns focus to search. A filtered
empty result keeps the discovery surface visible so recovery remains available.

## Structural tables

Use lightweight structural primitives instead of a generic column-definition data grid:

- `DataTableFrame` owns responsive overflow, border, surface, density, and optional sticky-header behavior.
- `DataTable` owns canonical table classes and accessible caption behavior.
- `DataTableHeaderCell` owns scope, numeric alignment, optional sort control, and `aria-sort`.
- `DataTableStateRow` renders loading, empty, filtered-empty, or error content across the active column count.

Feature code owns columns, row markup, domain actions, and responsive column visibility.

Every table has an accessible name or caption. A sortable header contains a keyboard-reachable button and exposes its current direction. Numeric and timestamp columns use consistent alignment and tabular numerals. Horizontal scrolling stays inside `DataTableFrame`; it must not create document-level overflow.

Responsive column hiding preserves the row identity and its primary action. Row actions use `ActionMenu`. Loading and empty states remain inside the table boundary without nested cards. Rendered Markdown tables are content output and may use a separate renderer-owned structure.

## Action menus and popovers

The repository-owned family is `ActionMenu`, `ActionMenuItem`, `ActionMenuSeparator`, `ActionSubmenu`, and `Popover`. Internal `useDismissableLayer` and `useRovingFocus` helpers keep behavior consistent. Support one nested submenu level only.

Action menus provide:

- Arrow-key movement, Home, End, and printable-key typeahead;
- Right and Left Arrow behavior for the supported submenu level;
- Escape dismissal and documented Tab behavior;
- outside-click dismissal;
- disabled-item skipping;
- trigger-focus restoration;
- viewport collision handling and edge clamping;
- correct menu, menuitem, checkbox-item, and radio-item semantics.

`Popover` is nonmodal and is used for arbitrary supplementary controls or content. It must not use menu roles unless its content is genuinely an action menu.

Feature code does not implement `role="menu"` or `role="listbox"`. The shared `Select` is the only listbox implementation.

## Forms and unsaved changes

Use `FormField`, `FormGroup`, `FormActions`, and `FormErrorSummary` for production forms.

`FormField` owns label association, required indication, help text, error text, `aria-describedby`, and `aria-invalid`. Features continue to own values, domain validation, and submitted payloads.

On attempted submission, focus the first invalid field. Clear a field error once the relevant value becomes valid. A failed submission preserves all entered values. Pending submission prevents duplicate submission and disables only conflicting actions.

Successful submission closes the overlay or updates the inline surface, restores meaningful focus, and applies the feedback policy below.

Dirty forms use `useUnsavedChangesGuard` for overlay close, in-app route navigation, browser history, and page unload. In-app navigation uses the shared confirmation dialog. The native unload mechanism is used only where the browser requires it. Reset and discard actions explain their effect and are not styled or described as destructive deletion.

Read-only forms render readable values and structure rather than a forest of disabled controls.

## Mutation feedback

Apply feedback at the narrowest surface that explains both the outcome and recovery:

| Situation | Required feedback |
| --- | --- |
| Field validation | `FieldValidationMessage` |
| Form or scoped mutation failure | `InlineAlert` within the relevant surface |
| Collection load failure | Embedded collection error with Retry |
| Background or non-blocking success | Toast |
| Partial success | Persistent warning with recovery action |
| Destructive completion | Toast plus removal from the current collection |

A toast is never the only explanation for an action that requires recovery. Pending mutations prevent conflicting actions and duplicate submission. Success and failure preserve a meaningful focus position.

## Permission-limited interfaces

Use control-plane capability fields; never infer access from local role names.

- Hide destinations and data the operator cannot read.
- Keep an action visible but disabled when the surrounding resource remains useful. Explain the limitation in a tooltip or nearby text.
- Render read-only forms as readable values.
- Handle server-side `403` responses even when the client already gates the action.

Permission meaning must not depend on color or iconography alone. Permission gating does not replace server authorization.

## Formatting and values

Use shared `Intl`-backed helpers for user-timezone date and time, relative time, duration, counts, percentages, and identifiers. Feature code does not introduce local formatting conventions.

Missing and invalid values use stable shared placeholders. If the visible value is truncated, preserve the complete value through an accessible label or tooltip. Comparable numeric values use tabular numerals where scan alignment matters.

## Internationalization

Shared primitives contain no domain-specific copy. Generic primitive labels use common translation keys. Features pass translated domain labels, descriptions, validation messages, and errors.

Production feature code does not hard-code user-visible English. Validate English and Mandarin text expansion, wrapping, and overlay sizing at desktop and compact widths and at 200% text size.

## Icons

Lucide is the only product icon family. Use the canonical control, row, panel, and empty-state sizes from the design system.

Decorative icons are `aria-hidden`. Icon-only controls require an accessible label and a tooltip. Status and other semantic meaning must include text and must not rely on an icon or color alone.

## Focus, announcements, and responsive behavior

Appending, filtering, retrying, opening, and closing surfaces preserve or restore focus deliberately. Do not move focus merely because background data refreshed.

Use polite live regions for collection counts, pagination progress, and nonurgent status. Avoid repeatedly announcing large collections. Use assertive alerts only when immediate interruption is warranted, such as a scoped failure that blocks the current action.

All interaction patterns support keyboard-only operation, visible focus, reduced motion, compact safe-area layout, English and Mandarin expansion, and 200% text resizing without clipped content or document-level horizontal overflow.

## Enforcement and exceptions

`npm run design:check` enforces visual and token rules. `npm run ui:check` enforces interaction composition. Both run from normal and CI validation.

The interaction checker rejects:

- `window.confirm`;
- feature-owned modal and drawer signatures;
- arbitrary overlay widths;
- feature-owned menu and listbox roles;
- direct pagination observers outside the cursor hook;
- paginated service methods projected to arrays or cursors discarded;
- raw production tables outside shared table primitives, excluding rendered Markdown;
- unreviewed interaction exceptions.

Exceptions are exact, capped, and justified. Each identifies one rule, file, exact pattern, maximum occurrence count, and durable reason. Missing, stale, broad, or over-cap exceptions fail validation. Restricted workbench dialogs and bounded `drain` consumers require this same review model.

## Ownership and verification

The management-console repository owns these primitives, hooks, helpers, tests, catalog specimens, and exceptions. Feature owners retain domain behavior and content.

Every public interaction primitive requires focused behavior tests and a catalog example. Coverage includes light and dark themes, desktop and compact layouts, English and Mandarin at 200% text size, keyboard-only operation, visible focus, reduced motion, safe areas, and every supported async, error, partial-success, retry, and permission-limited state.
