import React from 'react';
import type { TFunction } from 'i18next';
import { Bot, LoaderCircle, Settings } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import type { AiRuntimeReadinessStatus } from '@/features/ai/aiRuntimeReadiness';

interface TargetAssistantReadinessStateProps {
  canManageAiSettings: boolean;
  compact?: boolean;
  onOpenAiSettings: () => void;
  status: AiRuntimeReadinessStatus;
  t: TFunction;
}

export const TargetAssistantReadinessState: React.FC<TargetAssistantReadinessStateProps> = ({
  canManageAiSettings,
  compact = false,
  onOpenAiSettings,
  status,
  t
}) => {
  if (status === 'ready') return null;

  const isLoading = status === 'loading';
  const isUnavailable = status === 'unavailable';
  const title = isLoading
    ? t('chat.aiReadinessLoadingTitle')
    : isUnavailable
      ? t('chat.aiSettingsUnavailableTitle')
      : canManageAiSettings
        ? t('chat.aiSettingsRequiredManageTitle')
        : t('chat.aiSettingsRequiredReadOnlyTitle');
  const description = isLoading
    ? t('chat.aiReadinessLoadingBody')
    : isUnavailable
      ? canManageAiSettings
        ? t('chat.aiSettingsUnavailableManageBody')
        : t('chat.aiSettingsUnavailableReadOnlyBody')
      : canManageAiSettings
        ? t('chat.aiSettingsRequiredManageBody')
        : t('chat.aiSettingsRequiredReadOnlyBody');
  const actionLabel = isUnavailable ? t('chat.openAiSettings') : t('chat.configureAi');
  const canOpenSettings = !isLoading && canManageAiSettings;
  const icon = isLoading
    ? <LoaderCircle className="motion-safe:animate-spin" />
    : canOpenSettings
      ? <Settings />
      : <Bot />;

  if (compact) {
    return (
      <section
        className="border-t border-ui-border bg-ui-surface px-4 py-4 sm:px-6 lg:px-10"
        role="status"
        aria-live="polite"
        aria-busy={isLoading || undefined}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="type-row-title text-ui-text">{title}</h2>
            <p className="type-caption mt-1 max-w-[72ch] text-ui-text-muted">{description}</p>
          </div>
          {canOpenSettings && (
            <Button type="button" variant="secondary" size="sm" onClick={onOpenAiSettings} className="w-full sm:w-auto">
              {actionLabel}
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <EmptyState
      embedded
      className="min-h-full items-start pt-28 lg:pt-32 xl:pt-36"
      icon={icon}
      title={title}
      description={description}
      actions={canOpenSettings ? (
        <Button type="button" variant="secondary" size="md" onClick={onOpenAiSettings}>
          {actionLabel}
        </Button>
      ) : undefined}
      aria-live="polite"
      aria-busy={isLoading || undefined}
    />
  );
};
