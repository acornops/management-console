# Source-inspection test allowlist

Tests should exercise rendered components, imported functions, public APIs, or
explicit contract vectors. The following structural checks may inspect source
because their property is repository-wide or compile-time and has no stable
runtime boundary:

- src/applicationMotion.test.ts: repository-wide transition and reduced-motion policy.
- src/i18n/resources.test.ts: literal translation-key and locale-tree completeness.
- src/scrollbarStyles.test.ts: global CSS scoping and token policy.
- src/app/authRuntimeConfig.test.ts: fail-closed bootstrap/configuration wiring.
- src/components/common/DesignSystemPrimitives.test.ts: shared design-system vocabulary policy.
- src/components/common/ComponentVocabulary.test.ts: shared primitive adoption policy.
- src/components/common/ThemeMenu.test.ts: semantic theme-menu and focus policy.
- src/styles.test.ts: global design-token, responsive, and accessibility policy.
- src/stylesWorkspaceOverview.test.ts: workspace-overview token and layout policy.
- src/surfaceBehaviorContracts.test.ts: repository-wide surface behavior policy.
- src/features/targets/chat/components/ApprovalCheckpoint.patch-resource.test.ts: approval copy and redaction policy.
- src/features/targets/chat/components/TargetChatView.polish.test.ts: cross-component chat surface policy.
- src/features/targets/chat/components/ThinkingAcorn.polish.test.ts: reduced-motion and semantic loading-state policy.
- src/features/targets/chat/components/TraceFooter.polish.test.ts: trace disclosure and timestamp policy.

Feature behavior, credential lifecycle, authorization, navigation, and error
handling belong in Vitest/Testing Library or Playwright tests and must not be
added to this allowlist.
