import React from 'react';
import { MenuItem, Switch } from '@/components/common/FormControls';
import { createPortal } from 'react-dom';
import { Activity, BookOpen, Check, Download, Eye, FileText, Globe2, MoreVertical, RotateCcw, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { menuSurfaceClassName } from '@/components/common/menuStyles';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';
import { useFloatingActionMenu } from '@/hooks/useFloatingActionMenu';

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
  const actionMenuId = React.useId();
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const isTogglingTool = pendingToolId === tool.id;
  const isBlockedByOtherToolToggle = Boolean(pendingToolId && !isTogglingTool);
  const canEditTool = canEditTools && (tool.permissions?.canEdit ?? true);
  const isPlatformNative = tool.origin === 'platform_native';
  const isToggleable = tool.toggleable ?? !isPlatformNative;
  const canToggleTool = isToggleable && canEditTool && !isBlockedByOtherToolToggle && !isTogglingTool;
  const capabilityBadgeClassName = capability === 'write'
    ? 'bg-status-warning-soft text-status-warning-text'
    : 'bg-status-success-soft text-status-success-text';

  const targetInsightsActionCount = tool.id === 'target_insights' ? (canEditTool ? 5 : 4) : 1;
  const {
    triggerRef: actionMenuButtonRef,
    menuRef: actionMenuRef,
    style: actionMenuStyle,
    close: closeActionMenu
  } = useFloatingActionMenu({
    open: actionMenuOpen,
    setOpen: setActionMenuOpen,
    estimatedHeight: targetInsightsActionCount * 40 + 16
  });
  const invokeTargetInsightsAction = (action: 'files' | 'settings' | 'activity' | 'export' | 'reset') => {
    closeActionMenu();
    if (onTargetInsightsAction) {
      onTargetInsightsAction(tool, action);
      return;
    }
    onConfigure(tool);
  };

  const actionMenu = actionMenuOpen && actionMenuStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={actionMenuRef}
          id={actionMenuId}
          role="menu"
          className={menuSurfaceClassName('fixed z-[130] p-1')}
          style={actionMenuStyle}
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
                closeActionMenu();
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
        </div>,
        document.body
      )
    : null;

  return (
    <tr data-target-tool-row="true" className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45">
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg">
            {tool.id === 'target_insights'
              ? <BookOpen className="h-5 w-5 text-accent-strong" aria-hidden="true" />
              : isPlatformNative
                ? <FileText className="h-5 w-5 text-accent-strong" aria-hidden="true" />
                : <Globe2 className="h-5 w-5 text-accent-strong" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-ui-text">
              <span className="truncate">{tool.label}</span>
              <span className="type-micro-label shrink-0 rounded-full bg-accent-soft/45 px-2 py-0.5 text-accent-readable">
                {t('common.providedByAcornOps')}
              </span>
            </span>
            <span className="mt-1 block line-clamp-2 break-words text-xs leading-5 text-ui-text-muted" title={tool.description}>{tool.description}</span>
            <span className="mt-2 block text-xs text-ui-text-muted md:hidden">{runtimeLabel}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <span className={`type-micro-label rounded-full px-2.5 py-1 ${capabilityBadgeClassName}`}>
          {capabilityLabel}
        </span>
      </td>
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        {!isToggleable ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success-text">
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
      </td>
      <td className="hidden px-4 py-6 text-xs text-ui-text-muted sm:px-6 md:table-cell lg:px-8">
        <span className="type-micro-label rounded-full bg-ui-bg px-2.5 py-1 text-ui-text-muted">
          {runtimeLabel}
        </span>
      </td>
      <td className="px-4 py-6 text-right sm:px-6 lg:px-8">
        {isPlatformNative ? (
          <span className="type-caption text-ui-text-muted">{t('tools.noConfiguration')}</span>
        ) : (
          <>
            <button
              ref={actionMenuButtonRef}
              data-target-tool-primary-actions="true"
              type="button"
              onClick={() => setActionMenuOpen((isOpen) => !isOpen)}
              className="control-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              aria-haspopup="menu"
              aria-expanded={actionMenuOpen}
              aria-controls={actionMenuOpen ? actionMenuId : undefined}
              aria-label={t('tools.actionsNamed', { tool: tool.label })}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
            {actionMenu}
          </>
        )}
      </td>
    </tr>
  );
};
