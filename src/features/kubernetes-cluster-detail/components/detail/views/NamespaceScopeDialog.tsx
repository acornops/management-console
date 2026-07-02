import React from 'react';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { menuOptionClassName, menuSurfaceClassName } from '@/components/common/menuStyles';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { KubernetesCluster } from '@/types';

import {
  applyNamespaceTokenSelection,
  buildNamespaceSuggestions,
  filterNamespaceSuggestions,
  NamespaceScopeTarget,
  normalizeNamespaceTokens,
  splitNamespaceTokenInput
} from './namespaceScopeTokens';

interface NamespaceScopeDialogProps {
  cluster: KubernetesCluster;
  onClose: () => void;
  onSave: (scope: { include: string[]; exclude: string[] }) => Promise<void> | void;
}

function hasNamespaceDelimiter(value: string): boolean {
  return /[,\n\r]/.test(value);
}

function getClampedSuggestionIndex(index: number, suggestionCount: number): number {
  if (suggestionCount <= 0) return 0;
  return Math.min(index, suggestionCount - 1);
}

export const NamespaceScopeDialog: React.FC<NamespaceScopeDialogProps> = ({ cluster, onClose, onSave }) => {
  const { t } = useTranslation();
  const [includeNamespaces, setIncludeNamespaces] = React.useState(() =>
    normalizeNamespaceTokens(cluster.namespaceScope?.include || [])
  );
  const [excludeNamespaces, setExcludeNamespaces] = React.useState(() =>
    normalizeNamespaceTokens(cluster.namespaceScope?.exclude || [])
  );
  const [includeQuery, setIncludeQuery] = React.useState('');
  const [excludeQuery, setExcludeQuery] = React.useState('');
  const [activeScope, setActiveScope] = React.useState<NamespaceScopeTarget | null>(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const suggestions = React.useMemo(
    () => buildNamespaceSuggestions({ namespaces: cluster.namespaces, include: includeNamespaces, exclude: excludeNamespaces }),
    [cluster.namespaces, excludeNamespaces, includeNamespaces]
  );
  const includeSuggestions = React.useMemo(
    () => filterNamespaceSuggestions({ suggestions, selected: includeNamespaces, query: includeQuery }),
    [includeNamespaces, includeQuery, suggestions]
  );
  const excludeSuggestions = React.useMemo(
    () => filterNamespaceSuggestions({ suggestions, selected: excludeNamespaces, query: excludeQuery }),
    [excludeNamespaces, excludeQuery, suggestions]
  );

  React.useEffect(() => {
    setHighlightedSuggestionIndex(0);
  }, [activeScope, excludeQuery, excludeSuggestions.length, includeQuery, includeSuggestions.length]);

  const addTokens = React.useCallback(
    (target: NamespaceScopeTarget, tokens: string[]) => {
      const nextScope = applyNamespaceTokenSelection({
        include: includeNamespaces,
        exclude: excludeNamespaces,
        target,
        tokens
      });

      setIncludeNamespaces(nextScope.include);
      setExcludeNamespaces(nextScope.exclude);
      if (target === 'include') {
        setIncludeQuery('');
      } else {
        setExcludeQuery('');
      }
      setActiveScope(target);
      setHighlightedSuggestionIndex(0);
    },
    [excludeNamespaces, includeNamespaces]
  );

  const removeToken = (target: NamespaceScopeTarget, token: string) => {
    if (target === 'include') {
      setIncludeNamespaces((current) => current.filter((namespace) => namespace.toLocaleLowerCase() !== token.toLocaleLowerCase()));
    } else {
      setExcludeNamespaces((current) => current.filter((namespace) => namespace.toLocaleLowerCase() !== token.toLocaleLowerCase()));
    }
  };

  const removeLastToken = (target: NamespaceScopeTarget) => {
    if (target === 'include') {
      setIncludeNamespaces((current) => current.slice(0, -1));
    } else {
      setExcludeNamespaces((current) => current.slice(0, -1));
    }
  };

  const handleInputChange = (target: NamespaceScopeTarget, value: string) => {
    setActiveScope(target);
    if (hasNamespaceDelimiter(value)) {
      addTokens(target, splitNamespaceTokenInput(value));
      return;
    }

    if (target === 'include') {
      setIncludeQuery(value);
    } else {
      setExcludeQuery(value);
    }
  };

  const handleInputPaste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    target: NamespaceScopeTarget,
    query: string
  ) => {
    const pastedText = event.clipboardData.getData('text');
    if (!hasNamespaceDelimiter(pastedText)) return;

    event.preventDefault();
    addTokens(target, splitNamespaceTokenInput(`${query}${pastedText}`));
  };

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    target: NamespaceScopeTarget,
    query: string,
    fieldSuggestions: string[]
  ) => {
    if (event.key === 'Escape' && activeScope === target) {
      event.preventDefault();
      event.stopPropagation();
      setActiveScope(null);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveScope(target);
      setHighlightedSuggestionIndex((current) => (fieldSuggestions.length === 0 ? 0 : (current + 1) % fieldSuggestions.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveScope(target);
      setHighlightedSuggestionIndex((current) => {
        if (fieldSuggestions.length === 0) return 0;
        return current === 0 ? fieldSuggestions.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      const highlightedSuggestion = activeScope === target
        ? fieldSuggestions[getClampedSuggestionIndex(highlightedSuggestionIndex, fieldSuggestions.length)]
        : undefined;
      const tokens = highlightedSuggestion ? [highlightedSuggestion] : splitNamespaceTokenInput(query);
      if (tokens.length === 0) return;

      event.preventDefault();
      addTokens(target, tokens);
      return;
    }

    if (event.key === ',') {
      const tokens = splitNamespaceTokenInput(query);
      if (tokens.length === 0) return;

      event.preventDefault();
      addTokens(target, tokens);
      return;
    }

    if (event.key === 'Backspace' && query.length === 0) {
      removeLastToken(target);
    }
  };

  const handleFieldBlur = (event: React.FocusEvent<HTMLDivElement>, target: NamespaceScopeTarget) => {
    if (event.relatedTarget instanceof HTMLElement && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setActiveScope((current) => (current === target ? null : current));
  };

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSave({
        include: normalizeNamespaceTokens(includeNamespaces),
        exclude: normalizeNamespaceTokens(excludeNamespaces)
      });
      onClose();
    } catch (error) {
      setErrorMessage(formatControlPlaneError(error, t('clusterSetup.updateScopeFailed'), { area: 'cluster' }));
    } finally {
      setIsSaving(false);
    }
  };

  const includeHighlightedIndex = getClampedSuggestionIndex(highlightedSuggestionIndex, includeSuggestions.length);
  const excludeHighlightedIndex = getClampedSuggestionIndex(highlightedSuggestionIndex, excludeSuggestions.length);
  const includeListOpen = activeScope === 'include';
  const excludeListOpen = activeScope === 'exclude';

  return (
    <Dialog
      className="relative flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      closeDisabled={isSaving}
      overlayClassName="z-[120]"
      titleId="namespace-scope-title"
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-6 py-4">
        <div>
          <h3 id="namespace-scope-title" className="font-bold tracking-tight text-ui-text">
            {t('clusterSetup.editNamespaceScope')}
          </h3>
          <p className="mt-1 text-xs font-medium text-ui-text-muted">{cluster.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
          aria-label={t('clusterSetup.closeNamespaceScopeDialog')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-6 custom-scrollbar">
        <div className="rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-xs font-semibold leading-5 text-status-warning-text">
          {t('clusterSetup.namespaceScopeApplyHelp')}
        </div>
        {errorMessage && (
          <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-xs font-semibold leading-5 text-status-danger-text">
            {errorMessage}
          </div>
        )}

        <div className="relative space-y-1.5" onBlur={(event) => handleFieldBlur(event, 'include')}>
          <label htmlFor="namespace-scope-include-input" className="block px-1 text-xs font-bold uppercase tracking-widest text-ui-text-muted">
            {t('clusterSetup.includeNamespaces')}
          </label>
          <div className="rounded-lg border border-ui-border bg-ui-bg px-3 py-2 transition-all focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10">
            <div className="flex min-h-9 flex-wrap items-center gap-2">
              {includeNamespaces.map((namespace) => (
                <span key={namespace} className="inline-flex max-w-full items-center gap-1 rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-semibold text-ui-text">
                  <span className="truncate">{namespace}</span>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => removeToken('include', namespace)}
                    className="rounded-sm p-0.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong disabled:opacity-50"
                    aria-label={t('clusterSetup.removeNamespaceToken', { namespace })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="namespace-scope-include-input"
                value={includeQuery}
                disabled={isSaving}
                role="combobox"
                aria-autocomplete="list"
                aria-controls="namespace-scope-include-suggestions"
                aria-expanded={includeListOpen}
                aria-activedescendant={
                  includeListOpen && includeSuggestions.length > 0
                    ? `namespace-scope-include-option-${includeHighlightedIndex}`
                    : undefined
                }
                aria-describedby="namespace-scope-include-help"
                onChange={(event) => handleInputChange('include', event.target.value)}
                onFocus={() => setActiveScope('include')}
                onKeyDown={(event) => handleInputKeyDown(event, 'include', includeQuery, includeSuggestions)}
                onPaste={(event) => handleInputPaste(event, 'include', includeQuery)}
                placeholder={includeNamespaces.length === 0 ? t('clusterSetup.namespaceScopeIncludePlaceholder') : ''}
                className="min-w-[12rem] flex-1 bg-transparent px-1 py-1.5 text-sm text-ui-text outline-none placeholder:text-ui-text-muted disabled:opacity-50"
              />
            </div>
          </div>
          <p id="namespace-scope-include-help" className="px-1 text-[10px] font-medium text-ui-text-muted">
            {t('clusterSetup.namespaceScopeIncludeHelp')}
          </p>
          {includeListOpen && (
            <div
              id="namespace-scope-include-suggestions"
              role="listbox"
              className={menuSurfaceClassName('absolute z-20 mt-2 max-h-48 w-full p-1')}
            >
              {includeSuggestions.length > 0 ? (
                includeSuggestions.map((namespace, index) => (
                  <button
                    key={namespace}
                    id={`namespace-scope-include-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === includeHighlightedIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addTokens('include', [namespace])}
                    className={menuOptionClassName({
                      active: index === includeHighlightedIndex,
                      className: 'block rounded-sm text-sm font-semibold'
                    })}
                  >
                    {namespace}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs font-semibold text-ui-text-muted" role="status">
                  {t('clusterSetup.namespaceScopeAutocompleteEmpty')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative space-y-1.5" onBlur={(event) => handleFieldBlur(event, 'exclude')}>
          <label htmlFor="namespace-scope-exclude-input" className="block px-1 text-xs font-bold uppercase tracking-widest text-ui-text-muted">
            {t('clusterSetup.excludeNamespaces')}
          </label>
          <div className="rounded-lg border border-ui-border bg-ui-bg px-3 py-2 transition-all focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10">
            <div className="flex min-h-9 flex-wrap items-center gap-2">
              {excludeNamespaces.map((namespace) => (
                <span key={namespace} className="inline-flex max-w-full items-center gap-1 rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-semibold text-ui-text">
                  <span className="truncate">{namespace}</span>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => removeToken('exclude', namespace)}
                    className="rounded-sm p-0.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-accent-strong disabled:opacity-50"
                    aria-label={t('clusterSetup.removeNamespaceToken', { namespace })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="namespace-scope-exclude-input"
                value={excludeQuery}
                disabled={isSaving}
                role="combobox"
                aria-autocomplete="list"
                aria-controls="namespace-scope-exclude-suggestions"
                aria-expanded={excludeListOpen}
                aria-activedescendant={
                  excludeListOpen && excludeSuggestions.length > 0
                    ? `namespace-scope-exclude-option-${excludeHighlightedIndex}`
                    : undefined
                }
                aria-describedby="namespace-scope-exclude-help"
                onChange={(event) => handleInputChange('exclude', event.target.value)}
                onFocus={() => setActiveScope('exclude')}
                onKeyDown={(event) => handleInputKeyDown(event, 'exclude', excludeQuery, excludeSuggestions)}
                onPaste={(event) => handleInputPaste(event, 'exclude', excludeQuery)}
                placeholder={excludeNamespaces.length === 0 ? t('clusterSetup.namespaceScopeExcludePlaceholder') : ''}
                className="min-w-[12rem] flex-1 bg-transparent px-1 py-1.5 text-sm text-ui-text outline-none placeholder:text-ui-text-muted disabled:opacity-50"
              />
            </div>
          </div>
          <p id="namespace-scope-exclude-help" className="px-1 text-[10px] font-medium text-ui-text-muted">
            {t('clusterSetup.namespaceScopeExcludeHelp')}
          </p>
          {excludeListOpen && (
            <div
              id="namespace-scope-exclude-suggestions"
              role="listbox"
              className={menuSurfaceClassName('absolute z-20 mt-2 max-h-48 w-full p-1')}
            >
              {excludeSuggestions.length > 0 ? (
                excludeSuggestions.map((namespace, index) => (
                  <button
                    key={namespace}
                    id={`namespace-scope-exclude-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === excludeHighlightedIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addTokens('exclude', [namespace])}
                    className={menuOptionClassName({
                      active: index === excludeHighlightedIndex,
                      className: 'block rounded-sm text-sm font-semibold'
                    })}
                  >
                    {namespace}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs font-semibold text-ui-text-muted" role="status">
                  {t('clusterSetup.namespaceScopeAutocompleteEmpty')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button
          onClick={onClose}
          disabled={isSaving}
          variant="secondary"
          size="sm"
        >
          {t('app.cancel')}
        </Button>
        <Button
          onClick={() => void save()}
          disabled={isSaving}
          variant="primary"
          size="sm"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('clusterSetup.saveNamespaceScope')}
        </Button>
      </div>
    </Dialog>
  );
};
