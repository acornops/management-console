import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BookOpen, Loader2, SlidersHorizontal, Wrench } from 'lucide-react';
import type {
  ControlPlaneAssistantCapabilitiesPreview,
  ControlPlaneTargetAssistantCapabilitySkillPreviewItem,
  ControlPlaneTargetAssistantCapabilityToolPreviewItem
} from '@/services/control-plane/types';
import { Button } from '@acornops/ui';
import { IconTile } from '@acornops/ui';

interface AssistantCapabilityPreviewControlProps {
  canChat: boolean;
  isPanel: boolean;
  isLoading: boolean;
  error: string;
  preview: ControlPlaneAssistantCapabilitiesPreview | null;
  requestedToolAccessMode: 'read_only' | 'read_write';
}

const TOOL_CAPABILITY_ORDER: Record<ControlPlaneTargetAssistantCapabilityToolPreviewItem['capability'], number> = {
  write: 0,
  read: 1
};

function compareCapabilityToolPreviewItems(first: ControlPlaneTargetAssistantCapabilityToolPreviewItem, second: ControlPlaneTargetAssistantCapabilityToolPreviewItem): number {
  const capabilityOrder = TOOL_CAPABILITY_ORDER[first.capability] - TOOL_CAPABILITY_ORDER[second.capability];
  if (capabilityOrder !== 0) return capabilityOrder;
  const firstLabel = first.label || first.name;
  const secondLabel = second.label || second.name;
  return firstLabel.localeCompare(secondLabel, undefined, {
    sensitivity: 'base'
  });
}

function compareSkillPreviewItems(first: ControlPlaneTargetAssistantCapabilitySkillPreviewItem, second: ControlPlaneTargetAssistantCapabilitySkillPreviewItem): number {
  return first.name.localeCompare(second.name, undefined, {
    sensitivity: 'base'
  });
}

function capabilityBadgeClassName(capability: ControlPlaneTargetAssistantCapabilityToolPreviewItem['capability']): string {
  return capability === 'write' ? 'border border-status-warning/25 bg-status-warning-soft text-status-warning-text' : 'border border-ui-border bg-ui-surface text-ui-text-muted';
}

function capabilityChipLabel(
  preview: ControlPlaneAssistantCapabilitiesPreview | null,
  isLoading: boolean,
  error: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (isLoading) return t('chat.capabilityPreviewLoading');
  if (error) return t('chat.capabilityPreviewUnavailable');
  const toolCount = preview?.toolSummary.totalAllowed ?? 0;
  const skillCount = preview?.skillSummary.totalAvailable ?? 0;
  const toolLabel = t(toolCount === 1 ? 'chat.capabilityPreviewChipTool' : 'chat.capabilityPreviewChipTools', { count: toolCount });
  const skillLabel = t(skillCount === 1 ? 'chat.capabilityPreviewChipSkill' : 'chat.capabilityPreviewChipSkills', { count: skillCount });
  if (toolCount > 0 && skillCount > 0)
    return t('chat.capabilityPreviewChipToolsSkills', {
      toolsLabel: toolLabel,
      skillsLabel: skillLabel
    });
  if (skillCount > 0) return skillLabel;
  return toolLabel;
}

export const AssistantCapabilityPreviewControl: React.FC<AssistantCapabilityPreviewControlProps> = ({ canChat, isPanel, isLoading, error, preview, requestedToolAccessMode }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const controlId = React.useId();
  const buttonId = `${controlId}-button`;
  const panelId = `${controlId}-panel`;
  const modeLabel = requestedToolAccessMode === 'read_write' ? t('chat.capabilityPreviewModeReadWrite') : t('chat.capabilityPreviewModeReadOnly');
  const chipLabel = capabilityChipLabel(preview, isLoading, error, t);
  const writeUnavailableLabel =
    preview?.writeUnavailableReason === 'run_read_only'
      ? t('chat.capabilityPreviewWriteUnavailableReadOnly')
      : preview?.writeUnavailableReason === 'agent_write_disabled'
      ? t('chat.capabilityPreviewWriteUnavailableAgent')
      : '';
  const unavailableMcpToolCount = preview?.unavailableMcpToolCount ?? 0;
  const toolItems = React.useMemo(() => [...(preview?.tools ?? [])].sort(compareCapabilityToolPreviewItems), [preview?.tools]);
  const skillItems = React.useMemo(() => [...(preview?.skills ?? [])].sort(compareSkillPreviewItems), [preview?.skills]);
  const showToolPolicyNote = toolItems.length > 0 || Boolean(writeUnavailableLabel) || unavailableMcpToolCount > 0;
  const unavailableMcpLabel = unavailableMcpToolCount > 0
    ? t(
        unavailableMcpToolCount === 1
          ? 'chat.capabilityPreviewMcpToolUnavailable'
          : 'chat.capabilityPreviewMcpToolsUnavailable',
        { count: unavailableMcpToolCount }
      )
    : '';

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const targetElement = event.target instanceof Node ? event.target : null;
      if (targetElement && rootRef.current?.contains(targetElement)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!canChat) setIsOpen(false);
  }, [canChat]);

  return (
    <div ref={rootRef} className={isPanel ? 'static' : 'relative'}>
      <Button
        type="button"
        variant="tertiary"
        id={buttonId}
        data-assistant-capability-preview-trigger="true"
        onClick={() => setIsOpen((current) => !current)}
        disabled={!canChat}
        className="control-target inline-flex h-8 max-w-[9.5rem] items-center gap-1.5 rounded-full px-2.5 leading-5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={unavailableMcpLabel
          ? `${t('chat.capabilityPreviewAria')}. ${unavailableMcpLabel}`
          : t('chat.capabilityPreviewAria')}
        title={unavailableMcpLabel || undefined}
        aria-controls={panelId}
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : error || unavailableMcpToolCount > 0 ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-status-warning-text" />
        ) : (
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{chipLabel}</span>
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            id={panelId}
            className="absolute bottom-full right-0 z-50 mb-3 w-72 rounded-2xl border border-ui-border bg-ui-surface-strong p-3 type-body shadow-xl shadow-ui-text/10"
            role="region"
            aria-labelledby={buttonId}
          >
            <div className="flex items-start gap-2">
              <IconTile
                size="xs"
                tone={error ? 'warning' : 'neutral'}
                className="mt-0.5 h-7 w-7 rounded-full [&_svg]:h-3.5 [&_svg]:w-3.5"
              >
                {error ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-status-warning-text" />
                ) : isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                )}
              </IconTile>
              <div className="min-w-0">
                <p className="type-body type-emphasis text-ui-text">{t('chat.capabilityPreviewTitle')}</p>
                <p className="mt-1 type-caption leading-5 text-ui-text-muted">
                  {error ? t('chat.capabilityPreviewUnavailableBody') : isLoading ? t('chat.capabilityPreviewLoading') : modeLabel}
                </p>
              </div>
            </div>
            {preview && !error && !isLoading && (
              <>
                {showToolPolicyNote && (
                  <div className="mt-3 rounded-xl border border-ui-border bg-ui-bg px-3 py-2 type-caption leading-5 text-ui-text-muted">
                    {preview.confirmationRequiredForWrite && preview.toolSummary.writeAllowed > 0
                      ? t('chat.capabilityPreviewApprovalRequired')
                      : t('chat.capabilityPreviewApprovalNotRequired')}
                    {writeUnavailableLabel && <span className="mt-1 block text-status-warning-text">{writeUnavailableLabel}</span>}
                    {unavailableMcpToolCount > 0 && (
                      <span className="mt-1 block text-status-warning-text">
                        {unavailableMcpLabel}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 max-h-56 overflow-y-auto pr-1">
                  {toolItems.length === 0 && skillItems.length === 0 ? (
                    <p className="rounded-xl border border-ui-border bg-ui-bg px-3 py-2 type-caption text-ui-text-muted">{t('chat.capabilityPreviewEmpty')}</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 px-1 pb-1">
                          <span className="inline-flex min-w-0 items-center gap-1.5 type-micro-label">
                            <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {t('chat.capabilityPreviewToolsWithCount', {
                              count: toolItems.length
                            })}
                          </span>
                        </div>
                        {toolItems.length === 0 ? (
                          <p className="rounded-xl border border-ui-border bg-ui-bg px-3 py-2 type-caption text-ui-text-muted">{t('chat.capabilityPreviewNoTools')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {toolItems.map((tool) => (
                              <div key={`${tool.runtimeKind}:${tool.id}`} className="rounded-xl border border-ui-border bg-ui-bg px-3 py-2">
                                <div className="flex min-w-0 items-center justify-between gap-2">
                                  <span className="inline-flex min-w-0 items-center gap-2">
                                    <Wrench className="h-3.5 w-3.5 shrink-0 text-ui-text-muted" aria-hidden="true" />
                                    <span className="truncate type-caption type-emphasis text-ui-text">{tool.label || tool.name}</span>
                                  </span>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 type-micro-label ${capabilityBadgeClassName(tool.capability)}`}>{tool.capability}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 px-1 pb-1">
                          <span className="inline-flex min-w-0 items-center gap-1.5 type-micro-label">
                            <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {t('chat.capabilityPreviewSkillsWithCount', {
                              count: skillItems.length
                            })}
                          </span>
                        </div>
                        {skillItems.length === 0 ? (
                          <p className="rounded-xl border border-ui-border bg-ui-bg px-3 py-2 type-caption text-ui-text-muted">{t('chat.capabilityPreviewNoSkills')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {skillItems.map((skill) => (
                              <div key={skill.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-ui-border bg-ui-bg px-3 py-2">
                                <BookOpen className="h-3.5 w-3.5 shrink-0 text-ui-text-muted" aria-hidden="true" />
                                <span className="truncate type-caption type-emphasis text-ui-text">{skill.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="px-1 type-caption">{t('chat.capabilityPreviewFrozenWhenSent')}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
