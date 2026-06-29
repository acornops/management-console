# Knowledge Bank Console Surface

Status: Active

The management console exposes Knowledge Bank as a target tool inside the existing Tools route. Backend behavior is defined by the control-plane Knowledge Bank product spec; this document covers the console contract.

## Placement

- Knowledge Bank appears beside other built-in target tools in `TargetToolsView`.
- It uses the existing target tools catalog API and per-item permissions.
- The row uses the standard target tool inventory layout, capability/runtime badges, and row actions.

## Row Actions

Knowledge Bank uses focused row actions instead of one multi-pane configuration modal:

- `Edit files`: opens a skill-editor-sized file editor for target knowledge files.
- `Settings`: opens compact Knowledge Bank settings.
- `Activity`: opens read-only Knowledge Bank activity.
- `Export`: downloads the backend export.
- `Reset bank...`: opens a destructive confirmation dialog.

## File Editor Shape

The file editor intentionally borrows the visual shell of the target skill editor, but it does not expose the same filesystem controls.

Knowledge Bank is backed by control-plane entries, not a user-managed directory tree. Each entry has `title`, `status`, and `bodyMarkdown`; the API does not store an editable path, parent folder, or subfolder. The console may present entries as virtual Markdown files for readability:

- `active` entries appear under `knowledge-bank/active`.
- `pending` entries appear under `knowledge-bank/pending`.
- `archived` entries appear under `knowledge-bank/archived`.

Those folders are fixed system groups derived from entry status. Users can create a new knowledge file, edit its title/body, and use status actions to move it between the fixed groups. Users cannot create custom folders, subfolders, or arbitrary file paths in this pass.

The file editor hides raw frontmatter, confidence, signals, scope, and other internal evidence fields from the default edit flow. Existing APIs remain entry-based; the file path is display-only.

The editor header should show a compact filename derived from the entry title plus status, for example `registry-auth-401.md (Active)`. It should not show the full virtual path in the editor header, and it should not include a default details section for internal metadata. The left file tree should show the fixed status buckets as `active`, `pending`, and `archived`, without the `knowledge-bank/` prefix. These buckets should remain visible even when empty, and hover text should explain what each bucket contains.

The dialogs use existing platform primitives and tokens: `Dialog`, `Button`, `InlineLoadingIndicator`, `type-*` typography classes, `ui-*` colors, and lucide icons.

## Permissions

- Admin/owner users with `manage_knowledge_bank` can edit Knowledge Bank entries and settings.
- Operators with target read access can inspect entries, activity, settings, and export output in read-only mode.
- Catalog-level edit permission only means the user can edit at least one built-in target tool. Each row and dialog must also respect `tool.permissions.canEdit` for the selected tool.

## AI Readiness

The Tools page must remain fast and must not wait on live LLM gateway credential checks. The readiness value shown in the catalog reflects local policy/configuration validity only, such as provider/model allow-list failures.

The Knowledge Bank dialog may fetch workspace AI settings to show a credential-aware "learning paused" state. Credential availability is also checked by the background checkpoint worker when learning actually runs. Missing credentials pause learning and record Knowledge Bank activity; transient gateway failures are retried in the background. Retrieval and manual viewing remain available in both cases.

## Reset

Reset requires confirmation and permanently deletes current Knowledge Bank entries for the target. It does not imply audit or run history deletion.
