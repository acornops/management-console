# Knowledge Bank Console Surface

Status: Active

The management console exposes Knowledge Bank as a target tool inside the existing Tools route. Backend behavior is defined by the control-plane Knowledge Bank product spec; this document covers the console contract.

## Placement

- Knowledge Bank appears beside other built-in target tools in `TargetToolsView`.
- It uses the existing target tools catalog API and per-item permissions.
- The row uses the standard target tool inventory layout, capability/runtime badges, and row actions.

## Modal Shape

The Knowledge Bank dialog is intentionally compact and avoids the file-tree editor used by skills.

Tabs:

- `Entries`: searchable target-scoped knowledge entries, selected-entry Markdown editor, status, tags, evidence summary, confidence, and archive action.
- `Activity`: existing workspace audit events filtered to the target and category `knowledge`.
- `Settings`: enabled state, checkpoint model mode, provider/model when custom, idle delay, retrieval limits, generalization threshold, export, and reset.

The modal uses existing platform primitives and tokens: `Dialog`, `Button`, `InlineLoadingIndicator`, `type-*` typography classes, `ui-*` colors, and lucide icons.

## Permissions

- Admin/owner users with `manage_knowledge_bank` can edit Knowledge Bank entries and settings.
- Operators with target read access can inspect entries, activity, settings, and export output in read-only mode.
- Catalog-level edit permission only means the user can edit at least one built-in target tool. Each row and dialog must also respect `tool.permissions.canEdit` for the selected tool.

## AI Readiness

The Tools page must remain fast and must not wait on live LLM gateway credential checks. The readiness value shown in the catalog reflects local policy/configuration validity only, such as provider/model allow-list failures.

The Knowledge Bank dialog may fetch workspace AI settings to show a credential-aware "learning paused" state. Credential availability is also checked by the background checkpoint worker when learning actually runs. Missing credentials pause learning and record Knowledge Bank activity; transient gateway failures are retried in the background. Retrieval and manual viewing remain available in both cases.

## Reset

Reset requires confirmation and permanently deletes current Knowledge Bank entries for the target. It does not imply audit or run history deletion.
