import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Trans } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { DangerZone, DangerZoneRow } from '@/components/common/DangerZone';
import { Dialog } from '@/components/common/Dialog';
import { ICONS } from '@/constants';
import { formatControlPlaneError, type ControlPlaneErrorArea } from '@/services/control-plane/errorFormatting';

interface TargetDeleteZoneProps {
  targetName: string;
  title: string;
  subtitle: string;
  description: string;
  agentWarning: string;
  confirmationI18nKey: string;
  closeLabel: string;
  cancelLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  errorFallback: string;
  errorArea: ControlPlaneErrorArea;
  idBase: string;
  onDelete: () => void | Promise<void>;
}

export const TargetDeleteZone: React.FC<TargetDeleteZoneProps> = ({
  targetName,
  title,
  subtitle,
  description,
  agentWarning,
  confirmationI18nKey,
  closeLabel,
  cancelLabel,
  deleteLabel,
  deletingLabel,
  errorFallback,
  errorArea,
  idBase,
  onDelete
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const titleId = `${idBase}-delete-title`;
  const inputId = `${idBase}-delete-confirmation-input`;

  React.useEffect(() => {
    setIsOpen(false);
    setConfirmation('');
    setError(null);
  }, [targetName]);

  const closeDialog = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setConfirmation('');
    setError(null);
  };

  const confirmDelete = async () => {
    if (isDeleting || confirmation !== targetName) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      setIsOpen(false);
      setConfirmation('');
    } catch (cause) {
      setError(formatControlPlaneError(cause, errorFallback, { area: errorArea }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DangerZone className="mt-10">
        <DangerZoneRow
          id={`${idBase}-danger-title`}
          title={title}
          description={description}
          tone="danger"
          action={(
            <Button
              type="button"
              variant="danger"
              size="md"
              className="w-full"
              onClick={() => setIsOpen(true)}
            >
              <ICONS.Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {title}
            </Button>
          )}
        />
      </DangerZone>

      <AnimatePresence>
        {isOpen && (
          <Dialog
            titleId={titleId}
            closeDisabled={isDeleting}
            initialFocusRef={inputRef}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
            onClose={closeDialog}
          >
            <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-7 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
                  <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 id={titleId} className="type-row-title text-ui-text">{title}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{subtitle}</p>
                </div>
              </div>
              <CloseButton
                type="button"
                onClick={closeDialog}
                disabled={isDeleting}
                aria-label={closeLabel}
              />
            </div>

            <div className="space-y-4 px-7 py-6">
              <p className="text-sm leading-6 text-ui-text-muted">{description}</p>
              <p className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                {agentWarning}
              </p>
              <div>
                <label htmlFor={inputId} className="mb-1.5 block px-1 text-xs font-bold text-ui-text-muted">
                  <Trans
                    i18nKey={confirmationI18nKey}
                    values={{ name: targetName }}
                    components={{ name: <span className="font-extrabold text-status-danger-text" /> }}
                  />
                </label>
                <TextInput
                  ref={inputRef}
                  id={inputId}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={isDeleting}
                  autoComplete="off"
                  spellCheck={false}
                  className="px-4 focus:border-status-danger/45 focus:ring-status-danger/20"
                />
              </div>
              {error && (
                <div role="alert" className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-7 py-5">
              <Button type="button" variant="secondary" size="sm" onClick={closeDialog} disabled={isDeleting}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void confirmDelete()}
                disabled={isDeleting || confirmation !== targetName}
              >
                {isDeleting ? deletingLabel : deleteLabel}
              </Button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};
