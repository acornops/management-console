import React from 'react';
import { BookOpen, Wrench, X } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { ChatAssistantReference } from '@/types';
import { Button, ComboboxGroup, ComboboxListbox, ComboboxOption } from '@acornops/ui';

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
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-ui-border bg-ui-bg px-2 py-1 type-caption type-emphasis text-ui-text"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-ui-text-muted" aria-hidden="true" />
            <span className="truncate">{reference.label}</span>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => onRemove(reference)}
              className="control-target -mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              aria-label={t('chat.removeReference', { name: reference.label })}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
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

export const TargetChatReferenceMenu: React.FC<TargetChatReferenceMenuProps> = ({ id, references, activeIndex, query, onActiveIndexChange, onSelect, t }) => {
  const renderGroup = (kind: ChatAssistantReference['kind'], label: string) => {
    const items = references.map((reference, index) => ({ reference, index })).filter(({ reference }) => reference.kind === kind);
    if (items.length === 0) return null;
    return (
      <ComboboxGroup label={label}>
        <p className="px-3 pb-1 pt-2 type-micro-label">{label}</p>
        {items.map(({ reference, index }) => {
          const Icon = reference.kind === 'tool' ? Wrench : BookOpen;
          const isActive = index === activeIndex;
          const metadata =
            reference.kind === 'tool'
              ? [reference.capability, reference.source === 'mcp' ? 'MCP' : t('chat.referenceBuiltIn')].filter(Boolean).join(' · ')
              : reference.source === 'git_import'
              ? t('chat.referenceImportedSkill')
              : t('chat.referenceSkill');
          return (
            <ComboboxOption
              key={`${reference.kind}:${reference.id}`}
              id={`${id}-option-${index}`}
              active={isActive}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(reference)}
              className="control-target items-start gap-2 rounded-lg"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate type-body type-emphasis">{reference.label}</span>
                <span className="mt-0.5 block truncate type-caption text-ui-text-muted">{reference.description || metadata}</span>
              </span>
              <span className="shrink-0 pt-0.5 type-micro-label">{metadata}</span>
            </ComboboxOption>
          );
        })}
      </ComboboxGroup>
    );
  };

  return (
    <ComboboxListbox
      id={id}
      label={t('chat.referencePickerLabel')}
      className="absolute bottom-full left-2 right-2 z-50 mb-2 max-h-72 overflow-y-auto rounded-xl border border-ui-border bg-ui-surface-strong p-1.5 shadow-xl shadow-ui-text/10 custom-scrollbar"
    >
      {references.length === 0 ? (
        <p className="px-3 py-3 type-ui text-ui-text-muted">{query ? t('chat.referenceNoMatches') : t('chat.referenceNoneAvailable')}</p>
      ) : (
        <>
          {renderGroup('tool', t('chat.capabilityPreviewTools'))}
          {renderGroup('skill', t('chat.capabilityPreviewSkills'))}
        </>
      )}
    </ComboboxListbox>
  );
};
