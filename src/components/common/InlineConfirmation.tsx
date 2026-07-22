import React from 'react';
import { Button } from '@/components/common/Button';

interface InlineConfirmationProps {
  id: string;
  title: string;
  description: string;
  tone: 'warning' | 'danger';
  confirmLabel: string;
  confirmVariant?: 'secondary' | 'danger';
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel: string;
  className?: string;
}

export const InlineConfirmation: React.FC<InlineConfirmationProps> = ({
  id,
  title,
  description,
  tone,
  confirmLabel,
  confirmVariant = 'secondary',
  confirmDisabled = false,
  onCancel,
  onConfirm,
  cancelLabel,
  className = ''
}) => {
  const confirmationRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    confirmationRef.current?.focus({ preventScroll: true });
  }, []);

  const toneClassName = tone === 'danger'
    ? 'bg-status-danger-soft text-status-danger-text'
    : 'bg-status-warning-soft text-status-warning-text';

  return (
    <div
      ref={confirmationRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      className={`${toneClassName} px-5 py-4 outline-none sm:px-6 ${className}`}
    >
      <p id={`${id}-title`} className="text-sm font-semibold">{title}</p>
      <p id={`${id}-description`} className="type-caption mt-1">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="tertiary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
        <Button type="button" variant={confirmVariant} size="sm" disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  );
};
