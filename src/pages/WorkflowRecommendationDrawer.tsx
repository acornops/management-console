import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, InlineAlert } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { activateAutomationTemplate, installAutomationTemplate, listAutomationTemplates, type AutomationTemplateApi } from '@/services/control-plane/agentApi';

interface WorkflowRecommendationDrawerProps {
  open: boolean;
  workspaceId: string;
  focusWorkflowId?: string;
  canInstall: boolean;
  onClose: () => void;
  onChanged: (workflowId?: string) => void;
}

export const WorkflowRecommendationDrawer: React.FC<WorkflowRecommendationDrawerProps> = ({ open, workspaceId, focusWorkflowId, canInstall, onClose, onChanged }) => {
  const { t } = useTranslation();
  const titleId = React.useId();
  const [recommendations, setRecommendations] = React.useState<AutomationTemplateApi[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [pending, setPending] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);

  const selected = recommendations.find((recommendation) => recommendation.id === selectedId) || recommendations[0];

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    setActionError('');
    listAutomationTemplates(workspaceId)
      .then(({ templates: next }) => {
        if (!active) return;
        setRecommendations(next);
        setSelectedId(
          (current) =>
            next.find((recommendation) => recommendation.workflowId === focusWorkflowId)?.id ||
            (next.some((recommendation) => recommendation.id === current) ? current : '') ||
            next[0]?.id ||
            ''
        );
      })
      .catch((cause) => {
        if (!active) return;
        setRecommendations([]);
        setSelectedId('');
        setLoadError(cause instanceof Error ? cause.message : t('workflowRecommendations.loadFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [focusWorkflowId, open, reloadKey, t, workspaceId]);

  const run = async (key: string, operation: () => Promise<void>) => {
    setPending(key);
    setActionError('');
    try {
      await operation();
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('workflowRecommendations.actionFailed'));
    } finally {
      setPending('');
    }
  };

  const install = () =>
    selected &&
    run('install', async () => {
      const result = await installAutomationTemplate(workspaceId, selected.id);
      onChanged(result.workflowId);
    });
  const activate = () =>
    selected &&
    run('activate', async () => {
      const result = await activateAutomationTemplate(workspaceId, selected.id);
      onChanged(result.workflowId);
    });

  return (
    <DrawerFrame open={open} width="xl" titleId={titleId} title={t('workflowRecommendations.title')} description={t('workflowRecommendations.description')} onClose={onClose}>
      {loading ? (
        <p role="status" aria-live="polite" className="type-body text-ui-text-muted">
          {t('workflowRecommendations.loading')}
        </p>
      ) : loadError ? (
        <div className="space-y-4">
          <InlineAlert tone="danger" className="type-body">
            <strong>{t('workflowRecommendations.loadFailed')}</strong>
            <span className="mt-1 block">{loadError}</span>
          </InlineAlert>
          <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            {t('workflowRecommendations.retry')}
          </Button>
        </div>
      ) : recommendations.length === 0 ? (
        <p className="type-body text-ui-text-muted">{t('workflowRecommendations.empty')}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(13rem,0.75fr)_minmax(0,1.6fr)]">
          <nav aria-label={t('workflowRecommendations.list')} className="space-y-2">
            {recommendations.map((recommendation) => (
              <Button
                key={recommendation.id}
                type="button"
                variant="secondary"
                aria-current={selected?.id === recommendation.id ? 'true' : undefined}
                onClick={() => {
                  setSelectedId(recommendation.id);
                  setActionError('');
                }}
                className={`min-h-11 w-full rounded-lg border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-control-boundary ${
                  selected?.id === recommendation.id ? 'border-accent/40 bg-accent/5' : 'border-ui-border bg-ui-bg hover:bg-ui-surface'
                }`}
              >
                <span className="type-label block text-ui-text">{recommendation.name}</span>
                <span className="type-caption mt-1 flex flex-wrap items-center gap-1.5 text-ui-text-muted">
                  <span>{t('workflowRecommendations.byAcornOps')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{recommendation.installMode === 'automatic' ? t('workflowRecommendations.automatic') : t('workflowRecommendations.optIn')}</span>
                </span>
              </Button>
            ))}
          </nav>

          {selected ? (
            <section className="min-w-0 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="type-section-title text-ui-text">{selected.name}</h3>
                  <span className="type-micro-label text-ui-text-muted">{t('workflowRecommendations.byAcornOps')}</span>
                  <StatusBadge tone={selected.installationStatus === 'active' ? 'success' : selected.installationStatus === 'needs_setup' ? 'warning' : 'neutral'}>
                    {selected.installationStatus === 'not_installed'
                      ? t('workflowRecommendations.status.notAdded')
                      : selected.installationStatus === 'needs_setup'
                      ? t('workflowRecommendations.status.needsSetup')
                      : selected.installationStatus === 'ready'
                      ? t('workflowRecommendations.status.ready')
                      : t('workflowRecommendations.status.active')}
                  </StatusBadge>
                </div>
                <p className="type-caption mt-2 text-ui-text-muted">{selected.description}</p>
              </div>

              {selected.setupSteps.length > 0 && (
                <ol className="space-y-2 rounded-lg border border-ui-border bg-ui-bg p-4">
                  {selected.setupSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 type-body text-ui-text">
                      <span className="type-micro-label mt-0.5 text-ui-text-muted">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {!canInstall && selected.installationStatus !== 'active' && (
                <div className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-body text-ui-text-muted">{t('workflowRecommendations.installPermission')}</div>
              )}

              {selected.installationStatus === 'not_installed' && (
                <Button variant="secondary" disabled={!canInstall || Boolean(pending)} onClick={install}>
                  {pending === 'install' ? t('workflowRecommendations.installing') : t('workflowRecommendations.install')}
                </Button>
              )}

              {selected.installationStatus !== 'active' && selected.installationStatus !== 'not_installed' && (
                <Button
                  variant="activation"
                  disabled={!canInstall || Boolean(pending) || selected.blockerCodes.length > 0}
                  title={selected.blockerCodes.length > 0 ? t('workflowRecommendations.completeSetup') : undefined}
                  onClick={activate}
                >
                  {pending === 'activate' ? t('workflowRecommendations.activating') : t('workflowRecommendations.activate')}
                </Button>
              )}
              {actionError && (
                <InlineAlert tone="danger" className="type-body">
                  {actionError}
                </InlineAlert>
              )}
            </section>
          ) : null}
        </div>
      )}
    </DrawerFrame>
  );
};
