import React from 'react';
import { BookOpen, Wrench, X } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { ChatAssistantReference } from '@/types';

interface TargetChatReferenceChipsProps {
  references: ChatAssistantReference[];
  onRemove: (reference: ChatAssistantReference) => void;
  t: TFunction;
}

export const TargetChatReferenceChips: React.FC<TargetChatReferenceChipsProps> = ({ references, onRemove, t }) => {
  if (references.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-2 pb-2" role="list" aria-label={t('chat.references')}>
      {references.map((reference) => {
        const Icon = reference.kind === 'tool' ? Wrench : BookOpen;
        return (
          <span
            key={`${reference.kind}:${reference.id}`}
            role="listitem"
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-xs font-semibold text-ui-text"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-ui-text-muted" aria-hidden="true" />
            <span className="truncate">{reference.label}</span>
            <button
              type="button"
              onClick={() => onRemove(reference)}
              className="control-target -mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              aria-label={t('chat.removeReference', { name: reference.label })}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        );
      })}
    </div>
  );
};

interface TargetChatReferenceMenuProps {
  id: string;
  references: ChatAssistantReference[];
  activeIndex: number;
  query: string;
  onActiveIndexChange: (index: number) => void;
  onSelect: (reference: ChatAssistantReference) => void;
  t: TFunction;
}

export const TargetChatReferenceMenu: React.FC<TargetChatReferenceMenuProps> = ({
  id,
  references,
  activeIndex,
  query,
  onActiveIndexChange,
  onSelect,
  t
}) => {
  const renderGroup = (kind: ChatAssistantReference['kind'], label: string) => {
    const items = references
      .map((reference, index) => ({ reference, index }))
      .filter(({ reference }) => reference.kind === kind);
    if (items.length === 0) return null;
    return (
      <div role="group" aria-label={label}>
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ui-text-muted">{label}</p>
        {items.map(({ reference, index }) => {
          const Icon = reference.kind === 'tool' ? Wrench : BookOpen;
          const isActive = index === activeIndex;
          const metadata = reference.kind === 'tool'
            ? [reference.capability, reference.source === 'mcp' ? 'MCP' : t('chat.referenceBuiltIn')].filter(Boolean).join(' · ')
            : reference.source === 'git_import'
              ? t('chat.referenceImportedSkill')
              : t('chat.referenceSkill');
          return (
            <button
              key={`${reference.kind}:${reference.id}`}
              type="button"
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={isActive}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(reference)}
              className={`control-target flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors focus:outline-none ${isActive ? 'bg-ui-bg text-ui-text' : 'text-ui-text hover:bg-ui-bg'}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{reference.label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-ui-text-muted">
                  {reference.description || metadata}
                </span>
              </span>
              <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ui-text-muted">{metadata}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      id={id}
      role="listbox"
      aria-label={t('chat.referencePickerLabel')}
      className="absolute bottom-full left-2 right-2 z-50 mb-2 max-h-72 overflow-y-auto rounded-xl border border-ui-border bg-ui-surface-strong p-1.5 shadow-xl shadow-ui-text/10 custom-scrollbar"
    >
      {references.length === 0 ? (
        <p className="px-3 py-3 text-sm font-medium text-ui-text-muted">
          {query ? t('chat.referenceNoMatches') : t('chat.referenceNoneAvailable')}
        </p>
      ) : (
        <>
          {renderGroup('tool', t('chat.capabilityPreviewTools'))}
          {renderGroup('skill', t('chat.capabilityPreviewSkills'))}
        </>
      )}
    </div>
  );
};
