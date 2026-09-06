import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { expect, it, vi } from 'vitest';
import { en } from '@/i18n/locales/en.js';
import { VirtualMachineIssuesPanel } from './VirtualMachineIssuesPanel';
import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';

it('retains loaded issue rows when loading begins again', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: en } } });
  const issue: ControlPlaneIssueItem = {
    id: 'issue-1', workspaceId: 'workspace-1', targetId: 'vm-1', targetType: 'virtual_machine',
    title: 'Retained issue', summary: 'Evidence remains visible.', severity: 'warning', status: 'active',
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    firstSeenAt: '2026-09-01T00:00:00Z', lastSeenAt: '2026-09-01T00:00:00Z',
    fingerprint: 'host-service', issueType: 'service', lastObservedSnapshotAt: '2026-09-01T00:00:00Z',
    occurrenceCount: 1, reopenedCount: 0, cleanSnapshotCount: 0
  };
  const html = renderToStaticMarkup(<I18nextProvider i18n={i18n}><VirtualMachineIssuesPanel
    workspaceId="workspace-1" issues={[issue]} issueSummary={null} isLoading issueLoadFailed={false} onOpenIssueTriage={vi.fn()}
  /></I18nextProvider>);
  expect(html).toContain('Retained issue');
  expect(html).not.toContain('Loading open issues');
  expect(html).toContain('aria-busy="true"');
});
