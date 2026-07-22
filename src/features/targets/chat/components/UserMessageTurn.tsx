import React from 'react';
import type { TFunction } from 'i18next';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Button } from '@/components/common/Button';
import { BookOpen, Wrench } from 'lucide-react';
import { MessageActions } from '@/features/targets/chat/components/MessageActions';
import { markdownRemarkPlugins } from '@/features/targets/chat/lib/markdown';
import type { ChatMessage } from '@/types';

interface UserMessageTurnProps {
  message: ChatMessage;
  markdownComponents: Components;
  timestampLabel: string;
  canEdit: boolean;
  isEditing: boolean;
  editValue: string;
  isSubmittingEdit: boolean;
  onEditValueChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: () => void;
  t: TFunction;
}

export const UserMessageTurn: React.FC<UserMessageTurnProps> = ({
  message,
  markdownComponents,
  timestampLabel,
  canEdit,
  isEditing,
  editValue,
  isSubmittingEdit,
  onEditValueChange,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  t
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const selectionEnd = editValue.length;
    textarea.focus();
    textarea.setSelectionRange(selectionEnd, selectionEnd);
  }, [isEditing]);

  return (
    <div className="group flex w-full justify-end">
      <div className={`min-w-0 ${isEditing ? 'w-[min(42rem,88%)]' : 'max-w-[min(42rem,88%)]'}`}>
        <div
          className="rounded-lg border border-ui-text-muted/20 bg-ui-text px-4 py-3 text-sm font-medium text-ui-bg shadow-sm sm:px-5 sm:py-4"
          aria-label={t('chat.roleUser')}
        >
          <span className="sr-only">{t('chat.roleUser')}</span>
          {isEditing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitEdit();
              }}
            >
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(event) => onEditValueChange(event.target.value)}
                className="min-h-24 w-full resize-y rounded-md border border-ui-bg/20 bg-ui-bg/10 px-3 py-2 text-sm text-ui-bg outline-none transition-colors placeholder:text-ui-bg/50 focus:border-ui-bg/45 focus:ring-2 focus:ring-ui-bg/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmittingEdit}
                aria-label={t('chat.editMessage')}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onCancelEdit}
                  disabled={isSubmittingEdit}
                  className="border-ui-bg/20 bg-ui-bg/10 text-ui-bg hover:bg-ui-bg/15"
                >
                  {t('chat.cancelEdit')}
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={!editValue.trim() || isSubmittingEdit}
                  className="border-ui-bg/30 bg-ui-bg text-ui-text hover:bg-ui-bg/90"
                >
                  {t('chat.saveEdit')}
                </Button>
              </div>
            </form>
          ) : (
            <>
              {Boolean(message.assistantReferences?.length) && (
                <div className="mb-2 flex flex-wrap gap-1.5" role="list" aria-label={t('chat.references')}>
                  {message.assistantReferences!.map((reference) => {
                    const Icon = reference.kind === 'tool' ? Wrench : BookOpen;
                    return (
                      <span key={`${reference.kind}:${reference.id}`} role="listitem" className="inline-flex items-center gap-1 rounded bg-ui-bg/15 px-1.5 py-0.5 text-[11px] font-semibold">
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {reference.label}
                      </span>
                    );
                  })}
                </div>
              )}
              <ReactMarkdown components={markdownComponents} remarkPlugins={markdownRemarkPlugins}>
                {message.content}
              </ReactMarkdown>
            </>
          )}
        </div>
        {!isEditing && (
          <MessageActions
            align="right"
            copyText={message.content}
            timestampLabel={timestampLabel}
            onEdit={canEdit ? onStartEdit : undefined}
            t={t}
          />
        )}
      </div>
    </div>
  );
};
