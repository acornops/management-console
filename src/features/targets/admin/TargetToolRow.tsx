import React from 'react';
import { ActionMenu, IconTile, MenuItem, StatusBadge, Switch } from '@acornops/ui';
import { Activity, BookOpen, Check, Download, Eye, FileText, Globe2, MoreVertical, RotateCcw, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';
import { Button } from '@acornops/ui';
import { DataTableCell, DataTableRow } from '@acornops/ui';

interface TargetToolRowProps {
  tool: ControlPlaneTargetToolItem;
  runtimeLabel: string;
  capabilityLabel: string;
  capability: 'read' | 'write';
  canEditTools: boolean;
  pendingToolId: string | null;
  onConfigure: (tool: ControlPlaneTargetToolItem) => void;
  onTargetInsightsAction?: (tool: ControlPlaneTargetToolItem, action: 'files' | 'settings' | 'activity' | 'export' | 'reset') => void;
  onToggleTool: (tool: ControlPlaneTargetToolItem, enabled: boolean) => void;
}

export const TargetToolRow: React.FC<TargetToolRowProps> = ({
  tool,
  runtimeLabel,
  capabilityLabel,
  capability,
  canEditTools,
  pendingToolId,
  onConfigure,
  onTargetInsightsAction,
  onToggleTool
}) => {
  const { t } = useTranslation();
  const isTogglingTool = pendingToolId === tool.id;
  const isBlockedByOtherToolToggle = Boolean(pendingToolId && !isTogglingTool);
  const canEditTool = canEditTools && (tool.permissions?.canEdit ?? true);
  const isPlatformNative = tool.origin === 'platform_native';
  const isUnavailable = tool.enabled && tool.availability?.available === false;
  const isToggleable = tool.toggleable ?? !isPlatformNative;
  const canToggleTool = isToggleable && canEditTool && !isBlockedByOtherToolToggle && !isTogglingTool;

  const targetInsightsActionCount = tool.id === 'target_insights' ? (canEditTool ? 5 : 4) : 1;
  const invokeTargetInsightsAction = (action: 'files' | 'settings' | 'activity' | 'export' | 'reset') => {
    if (onTargetInsightsAction) {
      onTargetInsightsAction(tool, action);
      return;
    }
    onConfigure(tool);
  };

  const actionMenu = (
    <ActionMenu
      label={t('tools.actionsNamed', { tool: tool.label })}
      estimatedHeight={targetInsightsActionCount * 40 + 16}
      trigger={(
        <Button
          data-target-tool-primary-actions="true"
          type="button"
          variant="tertiary"
          size="icon"
          className="control-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    >
            {tool.id === 'target_insights' ? (
              <>
                <MenuItem onClick={() => invokeTargetInsightsAction('files')}>
                  <FileText className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                  <span>{canEditTool ? t('tools.targetInsights.editFiles') : t('tools.targetInsights.viewFiles')}</span>
                </MenuItem>
                <MenuItem onClick={() => invokeTargetInsightsAction('settings')}>
                  <Settings2 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                  <span>{t('tools.targetInsights.settings')}</span>
                </MenuItem>
                <MenuItem onClick={() => invokeTargetInsightsAction('activity')}>
                  <Activity className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                  <span>{t('tools.targetInsights.activity')}</span>
                </MenuItem>
                <MenuItem onClick={() => invokeTargetInsightsAction('export')}>
                  <Download className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                  <span>{t('tools.targetInsights.export')}</span>
                </MenuItem>
                {canEditTool && (
                  <MenuItem destructive onClick={() => invokeTargetInsightsAction('reset')}>
                    <RotateCcw className="h-4 w-4 shrink-0 text-status-danger-text" aria-hidden="true" />
                    <span>{t('tools.targetInsights.resetAction')}</span>
                  </MenuItem>
                )}
              </>
            ) : !isPlatformNative ? (
              <MenuItem
                onClick={() => {
                  onConfigure(tool);
                }}
              >
                {canEditTool ? (
                  <Settings2 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                )}
                <span>{canEditTool ? t('tools.configureTool') : t('tools.viewTool')}</span>
              </MenuItem>
            ) : null}
    </ActionMenu>
  );

  return (
    <DataTableRow data-target-tool-row="true" className="group transition-colors hover:bg-accent-soft/45">
      <DataTableCell className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <IconTile tone="accent">
            {tool.id === 'target_insights' ? (
              <BookOpen className="h-5 w-5 text-accent-strong" aria-hidden="true" />
            ) : isPlatformNative ? (
              <FileText className="h-5 w-5 text-accent-strong" aria-hidden="true" />
            ) : (
              <Globe2 className="h-5 w-5 text-accent-strong" aria-hidden="true" />
            )}
          </IconTile>
          <div className="min-w-0 flex-1">
            <span className="type-row-title flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate">{tool.label}</span>
              <span className="type-micro-label shrink-0 rounded-full bg-accent-soft/45 px-2 py-0.5 text-accent-readable">{t('common.providedByAcornOps')}</span>
              {isUnavailable && (
                <StatusBadge tone="warning">{t('tools.unavailable')}</StatusBadge>
              )}
            </span>
            <span className="type-caption mt-1 block line-clamp-2 break-words" title={tool.description}>
              {tool.description}
            </span>
            {isUnavailable && tool.availability?.unavailableReason === 'openai_responses_api_required' && (
              <span className="type-caption mt-1 block text-status-warning-text">{t('tools.openAiResponsesRequired')}</span>
            )}
            <span className="type-caption mt-2 block md:hidden">{runtimeLabel}</span>
          </div>
        </div>
      </DataTableCell>
      <DataTableCell className="px-4 py-6 sm:px-6 lg:px-8">
        <StatusBadge tone={capability === 'write' ? 'warning' : 'success'} className="px-2.5 py-1">{capabilityLabel}</StatusBadge>
      </DataTableCell>
      <DataTableCell className="px-4 py-6 sm:px-6 lg:px-8">
        {!isToggleable ? (
          <span className="type-caption inline-flex items-center gap-1.5 text-status-success-text">
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('tools.alwaysAvailable')}
          </span>
        ) : (
          <Switch
            checked={tool.enabled}
            aria-disabled={!canToggleTool}
            label={t(tool.enabled ? 'tools.disableNamed' : 'tools.enableNamed', { tool: tool.label })}
            disabled={!canToggleTool}
            onCheckedChange={(enabled) => {
              if (!canToggleTool) return;
              onToggleTool(tool, enabled);
            }}
          />
        )}
      </DataTableCell>
      <DataTableCell className="type-caption hidden px-4 py-6 sm:px-6 md:table-cell lg:px-8">
        <StatusBadge tone="neutral" className="px-2.5 py-1">{runtimeLabel}</StatusBadge>
      </DataTableCell>
      <DataTableCell className="px-4 py-6 text-right sm:px-6 lg:px-8">
        {isPlatformNative ? (
          <span className="type-caption text-ui-text-muted">{t('tools.noConfiguration')}</span>
        ) : (
          actionMenu
        )}
      </DataTableCell>
    </DataTableRow>
  );
};
