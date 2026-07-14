import React from 'react';
import type { TFunction } from 'i18next';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { CloseButton } from '@/components/common/ComponentVocabulary';
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
        <Button
          variant="icon"
          size="icon"
          onClick={onMaximize}
          aria-label={t('chat.fullscreen')}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </Tooltip>
    )}
    {onClose && (
      <Tooltip content={t('app.close')}>
        <CloseButton
          onClick={onClose}
          aria-label={t('app.close')}
        />
      </Tooltip>
    )}
  </div>
);
