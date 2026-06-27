import React from 'react';
import type { TFunction } from 'i18next';
import { Maximize2, X } from 'lucide-react';
import { Tooltip } from '@/components/common/Tooltip';

interface TargetChatPanelControlsProps {
  onClose?: () => void;
  onMaximize?: () => void;
  t: TFunction;
}

export const TargetChatPanelControls: React.FC<TargetChatPanelControlsProps> = ({ onClose, onMaximize, t }) => (
  <div className="flex shrink-0 items-center gap-1">
    {onMaximize && (
      <Tooltip content={t('chat.fullscreen')}>
        <button
          type="button"
          onClick={onMaximize}
          className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-label={t('chat.fullscreen')}
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </Tooltip>
    )}
    {onClose && (
      <Tooltip content={t('app.close')}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-label={t('app.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </Tooltip>
    )}
  </div>
);
