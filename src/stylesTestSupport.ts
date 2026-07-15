import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

export const styles = readSource('src/styles.css');
export const tailwindConfig = readSource('tailwind.config.js');
export const indexHtml = readSource('index.html');
export const designSystemHtml = readSource('design-system.html');
export const fonts = readSource('src/fonts.ts');
export const nginxConfig = readSource('nginx.conf');
export const loginPage = readSource('src/pages/LoginPage.tsx');
export const themeTransitionHook = readSource('src/hooks/useThemeTransition.ts');
export const themeMenu = readSource('src/components/common/ThemeMenu.tsx');
export const themeToggleIcon = readSource('src/components/common/ThemeToggleIcon.tsx');
export const themeInit = readSource('public/theme-init.js');
export const designSystemCheck = readSource('scripts/check-design-system.mjs');
export const loginPreview = readSource('src/pages/login/LoginPreview.tsx');
export const dashboardPage = readSource('src/components/dashboard/Dashboard.tsx');
export const overviewPage = readSource('src/pages/WorkspaceOverviewPage.tsx');
export const userSettingsPage = readSource('src/pages/UserSettingsPage.tsx');
export const workspaceSettingsPage = readSource('src/pages/WorkspaceSettingsPage.tsx');
export const settingsPage = readSource('src/pages/SettingsPage.tsx');
export const desktopSidebar = readSource('src/app/AppDesktopSidebar.tsx');
export const mobileNavigation = readSource('src/app/AppMobileNavigation.tsx');
export const appShell = readSource('src/app/AppShell.tsx');
export const appTargetChatRuntime = readSource('src/app/AppClusterChatRuntime.tsx');
export const appPageContent = readSource('src/app/AppPageContent.tsx');
export const appDialogs = readSource('src/app/AppDialogs.tsx');
export const workloadExplorerParts = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts.tsx'
);
export const resourceExplorerLayout = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout.tsx'
);
export const mcpServersView = readSource(
  'src/features/targets/admin/McpServersView.tsx'
);
export const mcpServerCard = readSource(
  'src/features/targets/admin/McpServerCard.tsx'
);
export const mcpServersDialogs = readSource(
  'src/features/targets/admin/McpServersDialogs.tsx'
);
export const mcpServerToolsDialog = readSource(
  'src/features/targets/admin/McpServerToolsDialog.tsx'
);
export const mcpServersInventory = readSource(
  'src/features/targets/admin/McpServersInventory.tsx'
);
export const chatView = [
  readSource('src/features/targets/chat/components/TargetChatView.tsx'),
  readSource('src/features/targets/chat/components/TargetChatViewBody.tsx'),
  readSource('src/features/targets/chat/components/TargetChatComposer.tsx'),
  readSource('src/features/targets/chat/components/targetChatViewHelpers.ts')
].join('\n');
export const assistantTurn = readSource(
  'src/features/targets/chat/components/AssistantTurn.tsx'
);
export const thinkingAcorn = readSource(
  'src/features/targets/chat/components/ThinkingAcorn.tsx'
);
export const messageActions = readSource(
  'src/features/targets/chat/components/MessageActions.tsx'
);
export const userMessageTurn = readSource(
  'src/features/targets/chat/components/UserMessageTurn.tsx'
);
export const approvalCheckpoint = readSource(
  'src/features/targets/chat/components/ApprovalCheckpoint.tsx'
);
export const chatGateDialog = readSource(
  'src/features/targets/chat/components/TargetChatGateDialog.tsx'
);
export const chatTranscriptStates = readSource(
  'src/features/targets/chat/components/ChatTranscriptStates.tsx'
);
export const conversationHistory = readSource(
  'src/features/targets/chat/components/ConversationHistory.tsx'
);
export const chatSubmit = readSource('src/features/targets/chat/hooks/chatSubmit.ts');
export const chatSessionSync = readSource('src/features/targets/chat/hooks/chatSessionSync.ts');
export const conversationAssistantStatuses = readSource(
  'src/features/targets/chat/hooks/useConversationAssistantStatuses.ts'
);
export const useTargetChat = readSource('src/features/targets/chat/hooks/useTargetChat.ts');
export const targetChatRunWatcher = readSource('src/features/targets/chat/hooks/targetChatRunWatcher.ts');
export const useTargetChatScrollAnchor = readSource(
  'src/features/targets/chat/hooks/useTargetChatScrollAnchor.ts'
);
export const clusterOverviewView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/OverviewView.tsx'
);
export const clusterSettingsView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/ClusterSettingsView.tsx'
);
export const traceFooter = readSource('src/features/targets/chat/components/TraceFooter.tsx');
export const markdownComponents = readSource('src/features/targets/chat/lib/markdown.tsx');
export const buttonComponent = readSource('src/components/common/Button.tsx');
export const pageComposition = readSource('src/components/common/PageComposition.tsx');
export const resourceCategoryTabs = readSource('src/components/common/ResourceCategoryTabs.tsx');
export const addClusterModal = readSource('src/components/kubernetes-clusters/AddClusterModal.tsx');
export const membersPage = [
  readSource('src/pages/WorkspaceMembersPage.tsx'),
  readSource('src/pages/workspace-members/MemberRoleCell.tsx'),
  readSource('src/pages/workspace-members/RoleChangeConfirmation.tsx'),
  readSource('src/pages/workspace-members/WorkspaceMemberDetailsPanel.tsx')
].join('\n');
export const workspaceInviteModal = readSource('src/pages/workspace-members/WorkspaceInviteModal.tsx');
export const loginAuthPanel = readSource('src/pages/login/LoginAuthPanel.tsx');
export const loginPasswordAuthForm = readSource('src/pages/login/LoginPasswordAuthForm.tsx');
export const loginAuthPanelParts = readSource('src/pages/login/LoginAuthPanelParts.tsx');
export const fieldValidationMessage = readSource('src/components/common/FieldValidationMessage.tsx');
export const auditLogPage = readSource('src/pages/WorkspaceAuditLogPage.tsx');
export const workloadsExplorer = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorer.tsx'
);
export const workloadsExplorerLists = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorerLists.tsx'
);
export const resourceExplorerControls = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/ResourceExplorerControls.tsx'
);
export const resourcesView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/ResourcesView.tsx'
);
export const typographyDoc = readSource('docs/design-docs/typography.md');
export const designDocsIndex = readSource('docs/design-docs/index.md');
export const enLocale = readSource('src/i18n/locales/en.js');
export const zhLocale = readSource('src/i18n/locales/zh.js');
export const workloadsExplorerSurface = `${workloadsExplorer}\n${workloadsExplorerLists}`;

export const lightTheme = styles.match(/:root \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';
export const darkTheme = styles.match(/\.dark \{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? '';

export const rgbVariableValue = (theme: string, variableName: string): [number, number, number] => {
  const match = theme.match(new RegExp(`${variableName}: (?<value>\\d+ \\d+ \\d+);`));
  if (!match?.groups?.value) throw new Error(`Missing ${variableName}`);
  return match.groups.value.split(' ').map(Number) as [number, number, number];
};

const relativeLuminance = ([red, green, blue]: [number, number, number]) => {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground: [number, number, number], background: [number, number, number]) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};
