import React from 'react';
import type { ControlPlaneTargetAssistantCapabilitiesPreview } from '@/services/control-plane/types';
import type { ChatAssistantReference } from '@/types';
import {
  MAX_CHAT_ASSISTANT_REFERENCES,
  removeSlashReferenceQuery,
  resolveSlashReferenceQuery
} from '@/features/targets/chat/types';

interface UseComposerReferencesArgs {
  assistantCapabilitiesPreview: ControlPlaneTargetAssistantCapabilitiesPreview | null;
  composerRootRef: React.RefObject<HTMLDivElement | null>;
  composerTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  inputValue: string;
  onInputChange: (value: string) => void;
  closeModelMenus: () => void;
}

export function useComposerReferences(args: UseComposerReferencesArgs) {
  const { assistantCapabilitiesPreview, composerRootRef, composerTextareaRef, inputValue, onInputChange, closeModelMenus } = args;
  const [composerReferences, setComposerReferences] = React.useState<ChatAssistantReference[]>([]);
  const [slashReferenceQuery, setSlashReferenceQuery] = React.useState<ReturnType<typeof resolveSlashReferenceQuery>>(null);
  const [referenceActiveIndex, setReferenceActiveIndex] = React.useState(0);
  const referenceMenuId = React.useId();
  const availableComposerReferences = React.useMemo<ChatAssistantReference[]>(() => {
    if (!assistantCapabilitiesPreview) return [];
    const selected = new Set(composerReferences.map((reference) => `${reference.kind}:${reference.id}`));
    const references: ChatAssistantReference[] = [
      ...assistantCapabilitiesPreview.tools.map((tool) => ({
        kind: 'tool' as const,
        id: tool.name,
        label: tool.label || tool.name,
        description: tool.description,
        capability: tool.capability,
        source: tool.source
      })),
      ...assistantCapabilitiesPreview.skills.map((skill) => ({
        kind: 'skill' as const,
        id: skill.id,
        label: skill.name,
        description: skill.description,
        source: skill.source
      }))
    ].filter((reference) => !selected.has(`${reference.kind}:${reference.id}`));
    const query = slashReferenceQuery?.query.trim().toLocaleLowerCase() || '';
    return query
      ? references.filter((reference) => [reference.label, reference.id, reference.description || '']
        .some((value) => value.toLocaleLowerCase().includes(query)))
      : references;
  }, [assistantCapabilitiesPreview, composerReferences, slashReferenceQuery?.query]);
  const isReferenceMenuOpen = Boolean(slashReferenceQuery)
    && composerReferences.length < MAX_CHAT_ASSISTANT_REFERENCES;
  const dismissReferenceMenu = React.useCallback(() => setSlashReferenceQuery(null), []);
  const clearComposerReferences = React.useCallback(() => {
    setComposerReferences([]);
    setSlashReferenceQuery(null);
    setReferenceActiveIndex(0);
  }, []);
  const handleComposerInputChange = React.useCallback((value: string, cursor: number) => {
    onInputChange(value);
    const nextQuery = resolveSlashReferenceQuery(value, cursor);
    setSlashReferenceQuery(nextQuery);
    setReferenceActiveIndex(0);
    if (nextQuery) closeModelMenus();
  }, [closeModelMenus, onInputChange]);
  const selectComposerReference = React.useCallback((reference: ChatAssistantReference) => {
    if (!slashReferenceQuery || composerReferences.length >= MAX_CHAT_ASSISTANT_REFERENCES) return;
    const nextValue = removeSlashReferenceQuery(inputValue, slashReferenceQuery);
    const cursor = slashReferenceQuery.start;
    setComposerReferences((current) => current.some((item) => item.kind === reference.kind && item.id === reference.id)
      ? current
      : [...current, reference]);
    setSlashReferenceQuery(null);
    setReferenceActiveIndex(0);
    onInputChange(nextValue);
    requestAnimationFrame(() => {
      composerTextareaRef.current?.focus({ preventScroll: true });
      composerTextareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }, [composerReferences.length, composerTextareaRef, inputValue, onInputChange, slashReferenceQuery]);
  const removeComposerReference = React.useCallback((reference: ChatAssistantReference) => {
    setComposerReferences((current) => current.filter((item) => item.kind !== reference.kind || item.id !== reference.id));
  }, []);
  const handleReferenceKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isReferenceMenuOpen) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setReferenceActiveIndex((current) => availableComposerReferences.length === 0
        ? 0
        : (current + direction + availableComposerReferences.length) % availableComposerReferences.length);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissReferenceMenu();
      return true;
    }
    if (event.key === 'Enter' && availableComposerReferences[referenceActiveIndex]) {
      event.preventDefault();
      selectComposerReference(availableComposerReferences[referenceActiveIndex]);
      return true;
    }
    return false;
  }, [availableComposerReferences, dismissReferenceMenu, isReferenceMenuOpen, referenceActiveIndex, selectComposerReference]);
  React.useEffect(() => {
    if (!isReferenceMenuOpen) return;
    const dismissOnOutsidePointer = (event: PointerEvent) => {
      if (!composerRootRef.current?.contains(event.target as Node)) dismissReferenceMenu();
    };
    document.addEventListener('pointerdown', dismissOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePointer);
  }, [composerRootRef, dismissReferenceMenu, isReferenceMenuOpen]);
  return {
    availableComposerReferences, clearComposerReferences, composerReferences, dismissReferenceMenu,
    handleComposerInputChange, handleReferenceKeyDown, isReferenceMenuOpen, referenceActiveIndex,
    referenceMenuId, removeComposerReference, selectComposerReference, setReferenceActiveIndex,
    slashReferenceQuery
  };
}
