import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import i18n, { initializeI18n } from '@/i18n';
import { WorkspaceSuspendedScreen } from '@/app/WorkspaceSuspendedScreen';
import { WorkflowLoadErrorNotice, WorkflowModeLabel } from '@/pages/WorkflowStatusUi';
import { WorkflowDetailTabs } from '@/pages/workflows/WorkflowDetailTabs';
import { AgentEmojiPicker } from '@/pages/agents/AgentAvatar';
import { TargetSkillFileTree } from '@/features/targets/admin/TargetSkillFileTree';
import { getWorkflowDeleteBlocker, getWorkflowLaunchBlocker, type WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { IssuePagination } from '@/pages/issues/IssuePagination';
import { VirtualMachineCollectionNotice } from '@/pages/virtual-machines/VirtualMachineCollectionNotice';
import type { CursorCollectionResult } from '@/hooks/useCursorCollection';
import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';

beforeAll(initializeI18n);
afterEach(() => i18n.changeLanguage('en'));

describe('bundled language rendering', () => {
  it('uses English singular forms for one workspace and plural forms for zero and many', () => {
    expect([0, 1, 3].map(count => i18n.t('app.availableWorkspacesDescription', { count }))).toEqual([
      '0 workspaces available to your account.', '1 workspace available to your account.', '3 workspaces available to your account.'
    ]);
    expect([1, 3].map(count => i18n.t('dashboard.clusterScopeIncluded', { count }))).toEqual(['1 included namespace', '3 included namespaces']);
    expect([1, 3].map(count => i18n.t('workflowActivity.attentionCount', { count }))).toEqual(['1 needs attention', '3 need attention']);
    expect([1, 3].map(count => i18n.t('members.inviteLinksCount', { count }))).toEqual(['1 loaded link', '3 loaded links']);
  });

  it('pluralizes loaded issue summaries by the total while keeping the loaded amount separate', async () => {
    const collection: CursorCollectionResult<ControlPlaneIssueItem> = {
      items: [], phase: 'ready', loadMore: async () => {}, loadAll: async () => [],
      refresh: async () => {}, retry: async () => {}, sentinelRef: () => {}
    };
    expect(renderToStaticMarkup(<IssuePagination collection={collection} total={1} />)).toContain('0 of 1 issue loaded');
    expect(renderToStaticMarkup(<IssuePagination collection={collection} total={3} />)).toContain('0 of 3 issues loaded');
    expect(i18n.t('issues.pagination.loadedOf', { count: 1, replace: { count: 1, total: 1 } })).toBe('1 of 1 issue loaded');
    expect(i18n.t('schedules.filters.showing', { count: 3, replace: { count: 1, total: 3 } })).toBe('Showing 1 of 3 schedules');
    await i18n.changeLanguage('zh');
    expect(renderToStaticMarkup(<IssuePagination collection={collection} total={1} />)).toContain('已加载 0 / 1 个问题');
  });

  it('renders workflow navigation and error recovery in Chinese', async () => {
    await i18n.changeLanguage('zh');
    const html = renderToStaticMarkup(<><WorkflowDetailTabs activeView="overview" workflowName="Payments runbook" onChange={() => {}} /><WorkflowLoadErrorNotice onRetry={() => {}} /><WorkflowModeLabel mode="read_only" /></>);
    expect(html).toContain('概览');
    expect(html).toContain('无法从控制平面加载工作流');
    expect(html).toContain('只读策略');
    expect(html).toContain('Payments runbook');
    expect(html).not.toContain('Scroll for more sections');
  });

  it('keeps existing custom-locale count placeholders working in rendered summaries', async () => {
    const customLocale = createInstance();
    await customLocale.init({ lng: 'fr', resources: { fr: { translation: {
      issues: { pagination: { loadedOf: '{{count}} sur {{total}} problèmes chargés' } },
      virtualMachines: { resources: { collection: { counts: '{{returned}} événements sur {{original}}' } } }
    } } } });
    const collection: CursorCollectionResult<ControlPlaneIssueItem> = {
      items: [], phase: 'ready', loadMore: async () => {}, loadAll: async () => [],
      refresh: async () => {}, retry: async () => {}, sentinelRef: () => {}
    };
    const html = renderToStaticMarkup(<I18nextProvider i18n={customLocale}>
      <IssuePagination collection={collection} total={3} />
      <VirtualMachineCollectionNotice label="Logs" collection={{ status: 'partial' }} logs={{ returned_count: 1, original_count: 3 }} />
    </I18nextProvider>);
    expect(html).toContain('0 sur 3 problèmes chargés');
    expect(html).toContain('1 événements sur 3');
    expect(html).not.toContain('{{');
  });

  it('translates suspended-workspace guidance while preserving the workspace name and public reason', async () => {
    await i18n.changeLanguage('zh');
    const workspace = { id: 'payments', name: 'Payments', publicReason: 'Operator-provided reason', accessState: 'suspended' } as Workspace;
    const html = renderToStaticMarkup(<WorkspaceSuspendedScreen workspace={workspace} workspaces={[workspace]} navigate={() => {}} onLogout={async () => {}} />);
    expect(html).toContain('Payments 已暂停');
    expect(html).toContain('刷新访问状态');
    expect(html).toContain('Operator-provided reason');
    expect(html).not.toContain('Refresh access');
  });

  it('translates Agent appearance controls and skill-file actions without changing filenames', async () => {
    await i18n.changeLanguage('zh');
    const html = renderToStaticMarkup(<><AgentEmojiPicker value="🤖" onChange={() => {}} /><TargetSkillFileTree files={[{ path: 'SKILL.md', content: '# User content' }]} activeFilePath="SKILL.md" canEditSkills resetKey="test" onFilesChange={() => {}} onActiveFilePathChange={() => {}} /></>);
    expect(html).toContain('使用其他表情符号');
    expect(html).toContain('添加文件');
    expect(html).toContain('SKILL.md');
    expect(html).not.toContain('No supporting files.');
  });

  it('translates local workflow launch and delete blockers while preserving server reasons', async () => {
    await i18n.changeLanguage('zh');
    const workflow = { status: 'active', policy: { mode: 'read_only', approvals: [] } } as WorkflowDefinition;
    expect(getWorkflowDeleteBlocker(workflow, false)).toBe('需要 manage_workflows 权限才能删除工作流。');
    expect(getWorkflowLaunchBlocker(workflow, 'Inspect', {})).toBe('需要 create_sessions 权限才能启动工作流。');
    expect(getWorkflowLaunchBlocker({ ...workflow, readiness: { status: 'blocked', reasons: ['Operator-provided reason'] } }, 'Inspect', {})).toBe('Operator-provided reason');
  });
});
