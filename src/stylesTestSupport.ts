import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

export const styles = readSource('src/styles.css');
export const tailwindConfig = readSource('tailwind.config.js');
export const indexHtml = readSource('index.html');
export const loginPage = readSource('src/pages/LoginPage.tsx');
export const loginPreview = readSource('src/pages/login/LoginPreview.tsx');
export const dashboardPage = readSource('src/components/dashboard/Dashboard.tsx');
export const overviewPage = readSource('src/pages/WorkspaceOverviewPage.tsx');
export const investigationsPage = readSource('src/pages/WorkspaceInvestigationsPage.tsx');
export const runbooksPage = readSource('src/pages/AgentRunbooksPage.tsx');
export const userSettingsPage = readSource('src/pages/UserSettingsPage.tsx');
export const workspaceSettingsPage = readSource('src/pages/WorkspaceSettingsPage.tsx');
export const desktopSidebar = readSource('src/app/AppDesktopSidebar.tsx');
export const mobileNavigation = readSource('src/app/AppMobileNavigation.tsx');
export const appShell = readSource('src/app/AppShell.tsx');
export const appPageContent = readSource('src/app/AppPageContent.tsx');
export const appDialogs = readSource('src/app/AppDialogs.tsx');
export const workloadExplorerParts = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts.tsx'
);
export const resourceExplorerLayout = readSource(
  'src/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout.tsx'
);
export const mcpServersView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/McpServersView.tsx'
);
export const mcpServerCard = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/McpServerCard.tsx'
);
export const mcpServersDialogs = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/McpServersDialogs.tsx'
);
export const chatView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/TargetChatView.tsx'
);
export const approvalCheckpoint = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/ApprovalCheckpoint.tsx'
);
export const chatComposerNotice = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/ChatComposerNotice.tsx'
);
export const conversationHistory = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/ConversationHistory.tsx'
);
export const chatSubmit = readSource('src/features/kubernetes-cluster-detail/hooks/chatSubmit.ts');
export const clusterOverviewView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/OverviewView.tsx'
);
export const clusterSettingsView = readSource(
  'src/features/kubernetes-cluster-detail/components/detail/views/ClusterSettingsView.tsx'
);
export const traceFooter = readSource('src/features/kubernetes-cluster-detail/components/detail/TraceFooter.tsx');
export const markdownComponents = readSource('src/features/kubernetes-cluster-detail/lib/markdown.tsx');
export const buttonComponent = readSource('src/components/common/Button.tsx');
export const addClusterModal = readSource('src/components/kubernetes-clusters/AddClusterModal.tsx');
export const membersPage = readSource('src/pages/WorkspaceMembersPage.tsx');
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
