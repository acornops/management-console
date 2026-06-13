import React from 'react';
import type { TFunction } from 'i18next';
import { Check, Copy, Pencil } from 'lucide-react';

interface MessageActionsProps {
  align: 'left' | 'right';
  copyText: string;
  timestampLabel: string;
  onEdit?: () => void;
  t: TFunction;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  align,
  copyText,
  timestampLabel,
  onEdit,
  t
}) => {
  const [hasCopied, setHasCopied] = React.useState(false);
  const copyResetTimeoutRef = React.useRef<number | null>(null);
  const canCopy = copyText.trim().length > 0;

  React.useEffect(() => () => {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
  }, []);

  React.useEffect(() => {
    setHasCopied(false);
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = null;
    }
  }, [copyText]);

  const handleCopy = async () => {
    if (!canCopy || !navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setHasCopied(true);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setHasCopied(false);
        copyResetTimeoutRef.current = null;
      }, 1600);
    } catch {
      setHasCopied(false);
    }
  };

  return (
    <div
      className={`mt-1 flex items-center gap-2 text-[11px] font-medium text-ui-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
        align === 'right' ? 'justify-end text-ui-text-muted' : 'justify-start'
      }`}
    >
      <time>{timestampLabel}</time>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-surface/75 hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
          aria-label={t('chat.editMessage')}
          title={t('chat.editMessage')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!canCopy}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-surface/75 hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={hasCopied ? t('chat.copiedMessage') : t('chat.copyMessage')}
        title={hasCopied ? t('chat.copiedMessage') : t('chat.copyMessage')}
      >
        {hasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};
