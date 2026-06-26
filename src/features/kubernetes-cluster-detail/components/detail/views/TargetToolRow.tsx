import React from 'react';
import { createPortal } from 'react-dom';
import { Eye, Globe2, MoreVertical, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { menuOptionClassName, menuSurfaceClassName } from '@/components/common/menuStyles';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';

interface TargetToolRowProps {
  tool: ControlPlaneTargetToolItem;
  runtimeLabel: string;
  capabilityLabel: string;
  capability: 'read' | 'write';
  canEditTools: boolean;
  pendingToolId: string | null;
  onConfigure: (tool: ControlPlaneTargetToolItem) => void;
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
  onToggleTool
}) => {
  const { t } = useTranslation();
  const actionMenuId = React.useId();
  const actionMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const [actionMenuStyle, setActionMenuStyle] = React.useState<React.CSSProperties | null>(null);
  const isTogglingTool = pendingToolId === tool.id;
  const isBlockedByOtherToolToggle = Boolean(pendingToolId && !isTogglingTool);
  const canToggleTool = canEditTools && !isBlockedByOtherToolToggle && !isTogglingTool;
  const capabilityBadgeClassName = capability === 'write'
    ? 'bg-status-warning-soft text-status-warning-text'
    : 'bg-status-success-soft text-status-success-text';

  const updateActionMenuPosition = React.useCallback(() => {
    const trigger = actionMenuButtonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 56;
    const top = Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 8);
    setActionMenuStyle({
      left: Math.max(8, rect.right - menuWidth),
      top: Math.max(8, top),
      width: menuWidth
    });
  }, []);

  React.useEffect(() => {
    if (!actionMenuOpen) return undefined;

    updateActionMenuPosition();
    const closeMenu = () => setActionMenuOpen(false);
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionMenuButtonRef.current?.contains(target) || actionMenuRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const handleResize = () => updateActionMenuPosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [actionMenuOpen, updateActionMenuPosition]);

  const closeActionMenu = () => setActionMenuOpen(false);
  const actionMenu = actionMenuOpen && actionMenuStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={actionMenuRef}
          id={actionMenuId}
          role="menu"
          className={menuSurfaceClassName('fixed z-[130] p-1')}
          style={actionMenuStyle}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeActionMenu();
              onConfigure(tool);
            }}
            className={menuOptionClassName()}
          >
            {canEditTools ? (
              <Settings2 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            )}
            <span>{canEditTools ? t('tools.configureTool') : t('tools.viewTool')}</span>
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <tr data-target-tool-row="true" className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45">
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg">
            <Globe2 className="h-5 w-5 text-accent-strong" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ui-text">{tool.label}</span>
            <span className="mt-1 block truncate text-xs leading-5 text-ui-text-muted" title={tool.description}>{tool.description}</span>
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
        <button
          type="button"
          role="switch"
          aria-checked={tool.enabled}
          aria-disabled={!canToggleTool}
          aria-label={t(tool.enabled ? 'tools.disableNamed' : 'tools.enableNamed', { tool: tool.label })}
          disabled={!canToggleTool}
          onClick={() => {
            if (!canToggleTool) return;
            onToggleTool(tool, !tool.enabled);
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed ${
            tool.enabled ? 'border-status-success bg-status-success' : 'border-ui-border bg-ui-text-muted/45'
          }`}
        >
          <span className="sr-only">{tool.enabled ? t('tools.enabled') : t('tools.disabled')}</span>
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-ui-surface shadow-sm transition-transform duration-200 ease-out ${
              tool.enabled ? 'translate-x-[22px]' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="hidden px-4 py-6 text-xs text-ui-text-muted sm:px-6 md:table-cell lg:px-8">
        <span className="type-micro-label rounded-full bg-ui-bg px-2.5 py-1 text-ui-text-muted">
          {runtimeLabel}
        </span>
      </td>
      <td className="px-4 py-6 text-right sm:px-6 lg:px-8">
        <button
          ref={actionMenuButtonRef}
          data-target-tool-primary-actions="true"
          type="button"
          onClick={() => setActionMenuOpen((isOpen) => !isOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-haspopup="menu"
          aria-expanded={actionMenuOpen}
          aria-controls={actionMenuOpen ? actionMenuId : undefined}
          aria-label={t('tools.actionsNamed', { tool: tool.label })}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        {actionMenu}
      </td>
    </tr>
  );
};
