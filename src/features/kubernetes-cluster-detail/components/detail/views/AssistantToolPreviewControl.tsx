import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import type { ControlPlaneTargetAssistantToolPreview } from '@/services/control-plane/types';

interface AssistantToolPreviewControlProps {
  canChat: boolean;
  isLoading: boolean;
  error: string;
  preview: ControlPlaneTargetAssistantToolPreview | null;
  requestedToolAccessMode: 'read_only' | 'read_write';
}

export const AssistantToolPreviewControl: React.FC<AssistantToolPreviewControlProps> = ({
  canChat,
  isLoading,
  error,
  preview,
  requestedToolAccessMode
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const controlId = React.useId();
  const buttonId = `${controlId}-button`;
  const panelId = `${controlId}-panel`;
  const modeLabel = requestedToolAccessMode === 'read_write'
    ? t('chat.toolPreviewModeReadWrite')
    : t('chat.toolPreviewModeReadOnly');
  const chipLabel = isLoading
    ? t('chat.toolPreviewLoading')
    : error
      ? t('chat.toolPreviewUnavailable')
      : t('chat.toolPreviewChip', { count: preview?.summary.totalAllowed ?? 0 });
  const writeUnavailableLabel = preview?.writeUnavailableReason === 'run_read_only'
    ? t('chat.toolPreviewWriteUnavailableReadOnly')
    : preview?.writeUnavailableReason === 'agent_write_disabled'
      ? t('chat.toolPreviewWriteUnavailableAgent')
      : '';
  const previewItems = preview?.items ?? [];

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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={buttonId}
        onClick={() => setIsOpen((current) => !current)}
        disabled={!canChat}
        className="inline-flex h-8 max-w-[8rem] items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold leading-5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t('chat.toolPreviewAria')}
        aria-controls={panelId}
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : error ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-status-warning-text" />
        ) : preview?.summary.writeAllowed ? (
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{chipLabel}</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            id={panelId}
            className="absolute bottom-full right-0 z-50 mb-3 w-72 rounded-2xl border border-ui-border bg-ui-surface-strong p-3 text-sm shadow-xl shadow-ui-text/10"
            role="dialog"
            aria-labelledby={buttonId}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ui-border bg-ui-bg text-ui-text-muted">
                {error ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-status-warning-text" />
                ) : isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ui-text">{t('chat.toolPreviewTitle')}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-ui-text-muted">
                  {error
                    ? t('chat.toolPreviewUnavailableBody')
                    : isLoading
                      ? t('chat.toolPreviewLoading')
                      : t('chat.toolPreviewCounts', {
                          mode: modeLabel,
                          read: preview?.summary.readAllowed ?? 0,
                          write: preview?.summary.writeAllowed ?? 0,
                          native: preview?.summary.nativeAllowed ?? 0
                        })}
                </p>
              </div>
            </div>
            {preview && !error && !isLoading && (
              <>
                <div className="mt-3 rounded-xl border border-ui-border bg-ui-bg px-3 py-2 text-xs font-medium leading-5 text-ui-text-muted">
                  {preview.confirmationRequiredForWrite && preview.summary.writeAllowed > 0
                    ? t('chat.toolPreviewApprovalRequired')
                    : t('chat.toolPreviewApprovalNotRequired')}
                  {writeUnavailableLabel && (
                    <span className="mt-1 block text-status-warning-text">{writeUnavailableLabel}</span>
                  )}
                </div>
                <div className="mt-3 max-h-56 overflow-y-auto pr-1">
                  {previewItems.length === 0 ? (
                    <p className="rounded-xl border border-ui-border bg-ui-bg px-3 py-2 text-xs font-medium text-ui-text-muted">
                      {t('chat.toolPreviewNoTools')}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {previewItems.map((tool) => (
                        <div key={`${tool.runtimeKind}:${tool.id}`} className="rounded-xl border border-ui-border bg-ui-bg px-3 py-2">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-ui-text">{tool.label || tool.name}</span>
                            <span className="shrink-0 rounded-full bg-ui-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ui-text-muted">
                              {tool.capability}
                            </span>
                          </div>
                        </div>
                      ))}
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
