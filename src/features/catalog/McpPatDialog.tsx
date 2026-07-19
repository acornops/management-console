import React from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { formatMcpError } from '@/services/control-plane/mcpError';

interface McpPatDialogProps {
  serverName: string;
  serverUrl?: string;
  authType?: 'bearer_token' | 'custom_header' | string;
  authHeaderName?: string;
  credentialLabel?: string;
  mode: 'connect' | 'replace';
  retryAfterSeconds?: number;
  onClose: () => void;
  onSubmit: (credential: string) => Promise<void>;
}

export const McpPatDialog: React.FC<McpPatDialogProps> = ({
  serverName,
  serverUrl,
  authType,
  authHeaderName,
  credentialLabel,
  mode,
  retryAfterSeconds = 0,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();
  const credentialRef = React.useRef<HTMLInputElement>(null);
  const [credential, setCredential] = React.useState('');
  const [consentGranted, setConsentGranted] = React.useState(false);
  const [showCredential, setShowCredential] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<unknown>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const errorId = React.useId();
  const contextId = React.useId();
  const credentialByteLength = new TextEncoder().encode(credential).byteLength;
  const credentialValidationError = credential.length === 0
    ? ''
    : credentialByteLength > 8192
      ? t('mcpServers.patTooLong')
      : /\p{Cc}/u.test(credential)
        ? t('mcpServers.patControlCharacters')
        : '';
  const error = submissionError
    ? formatMcpError(submissionError, t('mcpServers.connectionFailed'), retryAfterSeconds).message
    : '';
  const canSubmit = credential.length > 0 && !credentialValidationError && consentGranted && !pending && retryAfterSeconds === 0;
  let destinationOrigin = t('mcpServers.destinationUnavailable');
  if (serverUrl) {
    try {
      const destination = new URL(serverUrl);
      if (destination.protocol === 'https:' || destination.protocol === 'http:') {
        destinationOrigin = destination.origin;
      }
    } catch {
      // Do not display a malformed URL because it may contain a sensitive path or query.
    }
  }
  const headerMode = authType === 'custom_header'
    ? (authHeaderName || t('mcpServers.configuredCustomHeader'))
    : 'Authorization: Bearer';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setSubmissionError(null);
    try {
      await onSubmit(credential);
    } catch (cause) {
      setSubmissionError(cause);
      setPending(false);
    }
  };

  return (
    <Dialog
      titleId={titleId}
      initialFocusRef={credentialRef}
      closeDisabled={pending}
      onClose={onClose}
      className="w-full max-w-lg overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-5">
          <div className="min-w-0">
            <div className="type-micro-label mb-2 flex items-center gap-2 text-ui-text-muted">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              {t('mcpServers.personalPat')}
            </div>
            <h2 id={titleId} className="type-section-title">
              {t(mode === 'replace' ? 'mcpServers.replacePatTitle' : 'mcpServers.connectPatTitle', { name: serverName })}
            </h2>
            <p id={descriptionId} className="type-caption mt-2 text-ui-text-muted">
              {t('mcpServers.patDescription')}
            </p>
          </div>
          <CloseButton disabled={pending} onClick={onClose} aria-label={t('mcpServers.closePatDialog')} />
        </div>

        <div className="space-y-5 px-6 py-5">
          <dl id={contextId} className={`grid gap-3 rounded-lg border border-ui-border bg-ui-bg px-4 py-3 ${serverUrl ? 'sm:grid-cols-2' : ''}`}>
            {serverUrl && <div className="min-w-0">
              <dt className="type-micro-label text-ui-text-muted">{t('mcpServers.destinationOrigin')}</dt>
              <dd className="type-code mt-1 truncate text-ui-text" title={destinationOrigin}>{destinationOrigin}</dd>
            </div>}
            <div className="min-w-0">
              <dt className="type-micro-label text-ui-text-muted">{t('mcpServers.headerMode')}</dt>
              <dd className="type-code mt-1 truncate text-ui-text" title={headerMode}>{headerMode}</dd>
            </div>
          </dl>
          <div>
            <label htmlFor="mcp-personal-pat" className="type-label block text-ui-text">
              {credentialLabel || t('mcpServers.patLabel')}
            </label>
            <div className="relative mt-2">
              <TextInput
                ref={credentialRef}
                id="mcp-personal-pat"
                type={showCredential ? 'text' : 'password'}
                value={credential}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={8192}
                disabled={pending}
                aria-invalid={Boolean(error || credentialValidationError)}
                aria-describedby={`${contextId}${error || credentialValidationError ? ` ${errorId}` : ''}`}
                onChange={(event) => setCredential(event.target.value)}
                className="pr-12 font-mono"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowCredential((current) => !current)}
                aria-label={t(showCredential ? 'mcpServers.hidePat' : 'mcpServers.showPat')}
                className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-ui-text-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-control-boundary disabled:opacity-50"
              >
                {showCredential ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="type-caption mt-2 text-ui-text-muted">
              {t(authType === 'custom_header' ? 'mcpServers.customHeaderPatHelp' : 'mcpServers.bearerPatHelp')}
            </p>
            {credentialValidationError && (
              <p id={errorId} role="alert" className="type-caption mt-2 text-status-danger-text">
                {credentialValidationError}
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm text-ui-text">
            <Checkbox
              checked={consentGranted}
              disabled={pending}
              onChange={(event) => setConsentGranted(event.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span>{t('mcpServers.patConsent')}</span>
          </label>

          {error && !credentialValidationError && (
            <div id={errorId} role="alert" className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ui-border bg-ui-bg px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            {retryAfterSeconds > 0
              ? `Try again in ${retryAfterSeconds}s`
              : pending
                ? t('mcpServers.verifyingPat')
                : t(mode === 'replace' ? 'mcpServers.replaceAndVerifyPat' : 'mcpServers.saveAndVerifyPat')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
