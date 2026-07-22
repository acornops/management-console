import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { DrawerFrame } from '@/components/common/OverlayFrames';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  activateAutomationTemplate,
  installAutomationTemplate,
  listAutomationTemplates,
  type AutomationTemplateApi
} from '@/services/control-plane/agentApi';

interface WorkflowTemplateSetupDrawerProps {
  open: boolean;
  workspaceId: string;
  focusWorkflowId?: string;
  canInstall: boolean;
  onClose: () => void;
  onChanged: (workflowId?: string) => void;
}

export const WorkflowTemplateSetupDrawer: React.FC<WorkflowTemplateSetupDrawerProps> = ({
  open,
  workspaceId,
  focusWorkflowId,
  canInstall,
  onClose,
  onChanged
}) => {
  const { t } = useTranslation();
  const titleId = React.useId();
  const [templates, setTemplates] = React.useState<AutomationTemplateApi[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [pending, setPending] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);

  const selected = templates.find((template) => template.id === selectedId) || templates[0];

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    setActionError('');
    listAutomationTemplates(workspaceId)
      .then(({ templates: next }) => {
        if (!active) return;
        setTemplates(next);
        setSelectedId((current) => (
          next.find((template) => template.workflowId === focusWorkflowId)?.id
          || (next.some((template) => template.id === current) ? current : '')
          || next[0]?.id
          || ''
        ));
      })
      .catch((cause) => {
        if (!active) return;
        setTemplates([]);
        setSelectedId('');
        setLoadError(cause instanceof Error ? cause.message : t('workflowTemplates.loadFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [focusWorkflowId, open, reloadKey, t, workspaceId]);

  const run = async (key: string, operation: () => Promise<void>) => {
    setPending(key);
    setActionError('');
    try {
      await operation();
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('workflowTemplates.actionFailed'));
    } finally {
      setPending('');
    }
  };

  const install = () => selected && run('install', async () => {
    const result = await installAutomationTemplate(workspaceId, selected.id);
    onChanged(result.workflowId);
  });
  const activate = () => selected && run('activate', async () => {
    const result = await activateAutomationTemplate(workspaceId, selected.id);
    onChanged(result.workflowId);
  });

  return (
      <DrawerFrame
        open={open}
        width="xl"
        titleId={titleId}
        title={t('workflowTemplates.title')}
        description={t('workflowTemplates.description')}
        onClose={onClose}
      >
        {loading ? (
          <p role="status" aria-live="polite" className="text-sm text-ui-text-muted">{t('workflowTemplates.loading')}</p>
        ) : loadError ? (
          <div className="space-y-4">
            <div role="alert" className="rounded-md border border-status-danger/25 bg-status-danger-soft p-3 text-sm text-status-danger-text">
              <strong>{t('workflowTemplates.loadFailed')}</strong>
              <span className="mt-1 block">{loadError}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>{t('workflowTemplates.retry')}</Button>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-ui-text-muted">{t('workflowTemplates.empty')}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(13rem,0.75fr)_minmax(0,1.6fr)]">
          <nav aria-label={t('workflowTemplates.templateList')} className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                aria-current={selected?.id === template.id ? 'true' : undefined}
                onClick={() => { setSelectedId(template.id); setActionError(''); }}
                className={`min-h-11 w-full rounded-lg border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-control-boundary ${selected?.id === template.id ? 'border-accent/40 bg-accent/5' : 'border-ui-border bg-ui-bg hover:bg-ui-surface'}`}
              >
                <span className="type-label block text-ui-text">{template.name}</span>
                <span className="type-caption mt-1 flex flex-wrap items-center gap-1.5 text-ui-text-muted">
                  <span>{t('workflowTemplates.byAcornOps')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{template.installMode === 'automatic' ? t('workflowTemplates.automatic') : t('workflowTemplates.optIn')}</span>
                </span>
              </button>
            ))}
          </nav>

          {selected ? (
            <section className="min-w-0 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="type-section-title text-ui-text">{selected.name}</h3>
                  <span className="type-micro-label text-ui-text-muted">{t('workflowTemplates.byAcornOps')}</span>
                  <StatusBadge tone={selected.installationStatus === 'active' ? 'success' : selected.installationStatus === 'needs_setup' ? 'warning' : 'neutral'}>{selected.installationStatus.replace('_', ' ')}</StatusBadge>
                </div>
                <p className="type-caption mt-2 text-ui-text-muted">{selected.description}</p>
              </div>

              {selected.setupSteps.length > 0 && (
                <ol className="space-y-2 rounded-lg border border-ui-border bg-ui-bg p-4">
                  {selected.setupSteps.map((step, index) => <li key={step} className="flex gap-3 text-sm text-ui-text"><span className="type-micro-label mt-0.5 text-ui-text-muted">{index + 1}</span><span>{step}</span></li>)}
                </ol>
              )}

              {!canInstall && selected.installationStatus !== 'active' && (
                <div className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm text-ui-text-muted">{t('workflowTemplates.installPermission')}</div>
              )}

              {selected.installationStatus === 'not_installed' && (
                <Button variant="secondary" disabled={!canInstall || Boolean(pending)} onClick={install}>{pending === 'install' ? t('workflowTemplates.installing') : t('workflowTemplates.install')}</Button>
              )}

              {selected.installationStatus !== 'active' && selected.installationStatus !== 'not_installed' && (
                <Button variant="activation" disabled={!canInstall || Boolean(pending) || selected.blockerCodes.length > 0} title={selected.blockerCodes.length > 0 ? t('workflowTemplates.completeSetup') : undefined} onClick={activate}>{pending === 'activate' ? t('workflowTemplates.activating') : t('workflowTemplates.activate')}</Button>
              )}
              {actionError && <div role="alert" className="rounded-md border border-status-danger/25 bg-status-danger-soft p-3 text-sm text-status-danger-text">{actionError}</div>}
            </section>
          ) : null}
          </div>
        )}
      </DrawerFrame>
  );
};
