import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appDialogs = readFileSync(resolve(root, 'src/app/AppDialogs.tsx'), 'utf8');
const chatView = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/TargetChatView.tsx'), 'utf8');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');
const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const mcpServersDialogs = readFileSync(
  resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/McpServersDialogs.tsx'),
  'utf8'
);

describe('destructive confirmation dialogs', () => {
  it('requires typed confirmation before deleting a workspace', () => {
    expect(appDialogs).toContain('workspaceDeleteConfirmation');
    expect(appDialogs).toContain('setWorkspaceDeleteConfirmation');
    expect(appDialogs).toContain('id="delete-workspace-confirmation-input"');
    expect(appDialogs).toContain("t('app.deleteWorkspaceConfirmationLabel'");
    expect(appDialogs).toContain('workspaceDeleteConfirmation !== deleteTargetWorkspace.name');
    const workspaceConfirmationLabel = appDialogs.match(
      /htmlFor="delete-workspace-confirmation-input"[\s\S]*?className="([^"]+)"/
    );
    expect(workspaceConfirmationLabel?.[1]).not.toContain('uppercase');
  });

  it('requires typed confirmation before deleting a cluster', () => {
    expect(dashboard).toContain('deleteClusterConfirmation');
    expect(dashboard).toContain('setDeleteClusterConfirmation');
    expect(dashboard).toContain('id="delete-cluster-confirmation-input"');
    expect(dashboard).toContain("t('dashboard.deleteClusterConfirmationLabel'");
    expect(dashboard).toContain('deleteClusterConfirmation !== deleteTargetCluster.name');
    const clusterConfirmationLabel = dashboard.match(
      /htmlFor="delete-cluster-confirmation-input"[\s\S]*?className="([^"]+)"/
    );
    expect(clusterConfirmationLabel?.[1]).not.toContain('uppercase');
  });

  it('keeps MCP server and chat session deletes as confirm or cancel flows', () => {
    expect(mcpServersDialogs).not.toContain('deleteMcpServerConfirmation');
    expect(mcpServersDialogs).not.toContain('mcpServers.deleteConfirmationLabel');
    expect(chatView).not.toContain('deleteSessionConfirmation');
    expect(chatView).not.toContain('chat.deleteConversationConfirmationLabel');
  });

  it('uses concrete consequence copy for destructive actions', () => {
    expect(enLocale).toContain('cannot be recovered from the console');
    expect(enLocale).toContain('Kubernetes agent and in-cluster resources remain outside this console');
    expect(enLocale).toContain('saved conversation record cannot be recovered');
    expect(enLocale).toContain('server connection cannot be recovered');
  });
});
