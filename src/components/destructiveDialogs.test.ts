import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import React from 'react';
import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, Trans } from 'react-i18next';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const appDialogs = readFileSync(resolve(root, 'src/app/AppDialogs.tsx'), 'utf8');
const chatView = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/TargetChatView.tsx'), 'utf8');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');
const enLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const virtualMachinesListView = readFileSync(resolve(root, 'src/pages/virtual-machines/VirtualMachinesListView.tsx'), 'utf8');
const mcpServersDialogs = readFileSync(
  resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/McpServersDialogs.tsx'),
  'utf8'
);

async function renderConfirmationLabel(i18nKey: string, name: string) {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          app: {
            deleteWorkspaceConfirmationLabel: 'Type <name>{{name}}</name> to confirm'
          },
          dashboard: {
            deleteClusterConfirmationLabel: 'Type <name>{{name}}</name> to confirm'
          },
          virtualMachines: {
            list: {
              deleteVmConfirmationLabel: 'Type <name>{{name}}</name> to confirm'
            }
          }
        }
      }
    },
    interpolation: { escapeValue: true }
  });

  return renderToStaticMarkup(
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(Trans, {
        i18nKey,
        values: { name },
        components: {
          name: React.createElement('span', { className: 'font-extrabold text-status-danger-text' })
        }
      })
    )
  );
}

describe('destructive confirmation dialogs', () => {
  it('requires typed confirmation before deleting a workspace', () => {
    expect(appDialogs).toContain('workspaceDeleteConfirmation');
    expect(appDialogs).toContain('setWorkspaceDeleteConfirmation');
    expect(appDialogs).toContain('id="delete-workspace-confirmation-input"');
    expect(appDialogs).toContain('i18nKey="app.deleteWorkspaceConfirmationLabel"');
    expect(appDialogs).toContain('font-extrabold text-status-danger-text');
    expect(enLocale).toContain('Type <name>{{name}}</name> to confirm');
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
    expect(dashboard).toContain('i18nKey="dashboard.deleteClusterConfirmationLabel"');
    expect(dashboard).toContain('font-extrabold text-status-danger-text');
    expect(enLocale).toContain('Type <name>{{name}}</name> to confirm');
    expect(dashboard).toContain('deleteClusterConfirmation !== deleteTargetCluster.name');
    const clusterConfirmationLabel = dashboard.match(
      /htmlFor="delete-cluster-confirmation-input"[\s\S]*?className="([^"]+)"/
    );
    expect(clusterConfirmationLabel?.[1]).not.toContain('uppercase');
  });

  it('requires typed confirmation before deleting a VM', () => {
    expect(virtualMachinesListView).toContain('deleteVmConfirmation');
    expect(virtualMachinesListView).toContain('setDeleteVmConfirmation');
    expect(virtualMachinesListView).toContain('id="delete-vm-confirmation-input"');
    expect(virtualMachinesListView).toContain('i18nKey="virtualMachines.list.deleteVmConfirmationLabel"');
    expect(virtualMachinesListView).toContain('font-extrabold text-status-danger-text');
    expect(enLocale).toContain('Type <name>{{name}}</name> to confirm');
    expect(virtualMachinesListView).toContain('deleteVmConfirmation !== deleteTargetVm.name');
  });

  it('renders destructive confirmation names as styled inline text', async () => {
    const labels = await Promise.all([
      renderConfirmationLabel('app.deleteWorkspaceConfirmationLabel', 'Prod Workspace'),
      renderConfirmationLabel('dashboard.deleteClusterConfirmationLabel', 'prod-cluster'),
      renderConfirmationLabel('virtualMachines.list.deleteVmConfirmationLabel', 'vm-runner')
    ]);

    for (const html of labels) {
      expect(html).toContain('<span');
      expect(html).toContain('font-extrabold text-status-danger-text');
    }
    expect(labels[0]).toContain('Prod Workspace');
    expect(labels[1]).toContain('prod-cluster');
    expect(labels[2]).toContain('vm-runner');
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
