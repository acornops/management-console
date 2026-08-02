# Management Console Typography

The management console uses typography for operational scan speed. Keep the UI calm, dense where useful, and easy to compare across repeated rows, panels, and diagnostics.

## Font Families

- Use `Outfit` for product UI: headings, labels, controls, panels, rows, and prose.
- Use `Ubuntu Mono` only for code, log, trace, tool, token, and command surfaces.
- Do not add another font dependency without a design-doc update explaining the new role.

## Semantic Roles

Use the shared CSS role classes from `src/styles.css` instead of repeating ad hoc Tailwind type stacks:

| Role | Use |
| --- | --- |
| `type-route-title` | Route and page titles |
| `type-section-title` | Primary section titles inside a route |
| `type-panel-title` | Card, dialog, drawer, and side-panel titles |
| `type-row-title` | Table/list row names and compact item headings |
| `type-body` | Explanatory prose and helper copy |
| `type-ui` | Buttons, select triggers, and standard UI controls |
| `type-compact-ui` | Nested tabs and compact controls that retain full-size interaction targets |
| `type-emphasis` | Inline emphasis that must inherit its surrounding size and line height |
| `type-wordmark` | AcornOps wordmark lettering only |
| `type-caption` | Secondary metadata and dense supporting copy |
| `type-label` | Table headers, form labels, badges, and short status labels |
| `type-micro-label` | Very compact labels in charts, chips, trace rows, and dense controls |
| `type-data` | Standalone metric values and comparable numeric data |
| `type-count` | Compact inline counts in tabs, filters, and badges |
| `type-code` | Code, tool names, logs, trace identifiers, and command text |

## Operating Rules

- Prefer semantic roles over `font-bold`, `font-extrabold`, `text-[10px]`, `text-[11px]`, or wide uppercase tracking.
- Use `type-emphasis` only for inline emphasis. Headings, rows, labels, data, and controls must use their complete semantic role instead.
- Keep `type-wordmark` limited to the AcornOps wordmark; it is not a general bold-text utility.
- Keep uppercase labels compact. Use `type-label` or `type-micro-label`; avoid `tracking-widest` and exaggerated letter spacing.
- Use `type-data` for prominent numbers that operators compare across rows or panels. Use `type-count` when the number sits inline with a tab, filter, or badge label. Both enable tabular numeric rendering.
- Apply exactly one complete typography role to an element. `type-emphasis` and `type-wordmark` are narrow modifiers, not substitutes for a complete role.
- Use `type-code` for monospace surfaces only. Do not use monospace for decorative emphasis.
- Route headings should stay fixed-size. Do not use fluid or viewport-scaled typography in product UI.
- Body copy should stay readable at 65-75 characters where it is prose; dense tables and diagnostics can run wider.
