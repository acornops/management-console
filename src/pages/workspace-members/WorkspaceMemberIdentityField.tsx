import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Search, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionState } from '@acornops/ui';
import { TextInput } from '@acornops/ui';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { WorkspaceMemberCandidate, WorkspaceMemberDiscoveryMode } from '@/types';

interface WorkspaceMemberIdentityFieldProps {
  workspaceId: string;
  value: string;
  disabled: boolean;
  invalid: boolean;
  selectedCandidate: WorkspaceMemberCandidate | null;
  onChange: (value: string) => void;
  onMatchChange: (candidate: WorkspaceMemberCandidate | null) => void;
  onSelect: (candidate: WorkspaceMemberCandidate) => void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function candidateStatusLabel(status: WorkspaceMemberCandidate['status'], t: (key: string) => string): string {
  if (status === 'member') return t('members.alreadyMember');
  if (status === 'invited') return t('members.invitationPending');
  return t('members.existingUser');
}

export const WorkspaceMemberIdentityField: React.FC<WorkspaceMemberIdentityFieldProps> = ({
  workspaceId,
  value,
  disabled,
  invalid,
  selectedCandidate,
  onChange,
  onMatchChange,
  onSelect
}) => {
  const { t } = useTranslation();
  const listboxId = useId();
  const [mode, setMode] = useState<WorkspaceMemberDiscoveryMode | null>(null);
  const [candidates, setCandidates] = useState<WorkspaceMemberCandidate[]>([]);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimerRef = useRef<number | undefined>(undefined);
  const normalizedValue = value.trim().toLowerCase();
  const queryIsEligible = mode === 'directory' ? normalizedValue.length >= 2 : mode === 'exact_email' && emailPattern.test(normalizedValue);
  const exactCandidate = useMemo(() => candidates.find((candidate) => candidate.email.toLowerCase() === normalizedValue) || null, [candidates, normalizedValue]);
  const listIsOpen = Boolean(isFocused && !disabled && mode === 'directory' && queryIsEligible && (phase === 'loading' || candidates.length > 0));

  useEffect(() => {
    const controller = new AbortController();
    void controlPlaneApi
      .searchWorkspaceMemberCandidates(workspaceId, '', controller.signal)
      .then((response) => setMode(response.mode))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== 'AbortError') {
          setMode('disabled');
        }
      });
    return () => controller.abort();
  }, [workspaceId]);

  useEffect(() => {
    onMatchChange(exactCandidate);
  }, [exactCandidate, onMatchChange]);

  useEffect(() => {
    if (!mode || !queryIsEligible || selectedCandidate) {
      setCandidates([]);
      setPhase('idle');
      setActiveIndex(-1);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPhase('loading');
      void controlPlaneApi
        .searchWorkspaceMemberCandidates(workspaceId, normalizedValue, controller.signal)
        .then((response) => {
          setMode(response.mode);
          setCandidates(response.items);
          setActiveIndex(response.items.findIndex((candidate) => candidate.status === 'available'));
          setPhase('ready');
        })
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === 'AbortError') return;
          setCandidates([]);
          setActiveIndex(-1);
          setPhase('error');
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, normalizedValue, queryIsEligible, selectedCandidate, workspaceId]);

  useEffect(
    () => () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    },
    []
  );

  const moveActive = (offset: number) => {
    if (!candidates.length) return;
    let nextIndex = activeIndex;
    for (let checked = 0; checked < candidates.length; checked += 1) {
      nextIndex = (nextIndex + offset + candidates.length) % candidates.length;
      if (candidates[nextIndex]?.status === 'available') {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const selectActive = () => {
    const candidate = candidates[activeIndex];
    if (candidate?.status === 'available') onSelect(candidate);
  };

  const helper = selectedCandidate
    ? t('members.existingUserSelected', { name: selectedCandidate.name })
    : exactCandidate?.status === 'available'
    ? t('members.existingUserSelected', { name: exactCandidate.name })
    : exactCandidate?.status === 'member'
    ? t('members.alreadyMember')
    : exactCandidate?.status === 'invited'
    ? t('members.invitationPending')
    : phase === 'error'
    ? t('members.directoryUnavailable')
    : mode === 'directory' && queryIsEligible && phase === 'ready' && candidates.length === 0
    ? t('members.noDirectoryMatches')
    : mode === 'directory'
    ? t('members.directoryHint')
    : mode === 'exact_email'
    ? t('members.exactEmailHint')
    : t('members.inviteEmailHint');

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
        <TextInput
          id="workspace-invite-email"
          type="text"
          role={mode === 'directory' ? 'combobox' : undefined}
          aria-autocomplete={mode === 'directory' ? 'list' : undefined}
          aria-controls={mode === 'directory' ? listboxId : undefined}
          aria-expanded={mode === 'directory' ? listIsOpen : undefined}
          aria-activedescendant={listIsOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'workspace-invite-email-error' : undefined}
          autoComplete="off"
          maxLength={mode === 'directory' ? 200 : 320}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
            setIsFocused(true);
          }}
          onBlur={() => {
            blurTimerRef.current = window.setTimeout(() => setIsFocused(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              moveActive(1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              moveActive(-1);
            } else if (event.key === 'Enter' && listIsOpen && activeIndex >= 0) {
              event.preventDefault();
              selectActive();
            } else if (event.key === 'Escape') {
              setIsFocused(false);
            }
          }}
          disabled={disabled}
          placeholder={mode === 'directory' ? t('members.directoryPlaceholder') : t('members.emailPlaceholder')}
          className={`pl-11 pr-10 ${invalid ? 'border-status-danger bg-status-danger-soft focus:border-status-danger focus:ring-status-danger/15' : ''}`}
        />
        {phase === 'loading' && <Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ui-text-muted" aria-hidden="true" />}
        {selectedCandidate && phase !== 'loading' && (
          <Check className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-status-success-text" aria-hidden="true" />
        )}
      </div>

      <p className="mt-2 flex min-h-5 items-start gap-2 text-xs font-medium leading-5 text-ui-text-muted">
        {selectedCandidate && <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success-text" aria-hidden="true" />}
        <span>{helper}</span>
      </p>

      {listIsOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t('members.directoryResults')}
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-ui-border bg-ui-surface p-1.5 shadow-lg"
        >
          <CollectionState
            phase={phase === 'idle' ? 'ready' : phase}
            itemCount={candidates.length}
            loading={<div className="px-3 py-2.5 text-xs font-medium text-ui-text-muted">{t('members.searchingDirectory')}</div>}
            empty={null}
            error={null}
            className="contents"
          >
            {candidates.map((candidate, index) => {
              const available = candidate.status === 'available';
              return (
                <button
                  key={candidate.userId}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  disabled={!available}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => available && setActiveIndex(index)}
                  onClick={() => available && onSelect(candidate)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors focus:outline-none sm:min-h-9 ${
                    index === activeIndex ? 'bg-accent-soft text-ui-text' : 'text-ui-text hover:bg-ui-bg'
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold">{candidate.name}</span>
                      {candidate.authMethods.includes('oidc') && (
                        <span className="shrink-0 rounded border border-ui-border px-1.5 py-0.5 type-micro-label">{t('members.oidcUser')}</span>
                      )}
                    </span>
                    <span className="block truncate text-xs font-medium text-ui-text-muted">{candidate.email}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-ui-border bg-ui-bg px-2 py-1 type-micro-label">{candidateStatusLabel(candidate.status, t)}</span>
                </button>
              );
            })}
          </CollectionState>
        </div>
      )}
    </div>
  );
};
