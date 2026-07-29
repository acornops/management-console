import React from 'react';
import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, Checkbox, CloseButton, Dialog, InlineLoadingIndicator, Select } from '@acornops/ui';
import { formatMcpError } from '@/services/control-plane/mcpError';
import type {
  McpOAuthIssuerCandidate,
  McpOAuthPreparation
} from '@/services/control-plane/catalogApi';
import { openMcpOAuthAuthorizationTab } from './mcpOAuthWindowHandoff';

interface McpOAuthDialogProps {
  serverName: string;
  returnPath: string;
  mode: 'authorize' | 'reauthorize';
  retryAfterSeconds?: number;
  onClose: () => void;
  onPrepare: (returnPath: string) => Promise<McpOAuthPreparation | undefined>;
  onStart: (preparationHandle: string, issuer?: string) => Promise<string | undefined>;
}

export function registrationMethodLabel(candidate: McpOAuthIssuerCandidate): string {
  return candidate.registrationMethod === 'cimd'
    ? 'Client ID Metadata Document (CIMD)'
    : 'Dynamic Client Registration (DCR)';
}

export function authorizationServerLabel(candidate: McpOAuthIssuerCandidate): string {
  return candidate.issuer;
}

export const McpOAuthConsentReview: React.FC<{
  candidate: McpOAuthIssuerCandidate;
  consentGranted: boolean;
  disabled?: boolean;
  onConsentChange: (granted: boolean) => void;
}> = ({ candidate, consentGranted, disabled = false, onConsentChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="rounded-lg border border-ui-border bg-ui-bg px-4 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-success-text" aria-hidden="true" />
          <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="type-micro-label text-ui-text-muted">
                {t('mcpServers.authorizationServer')}
              </dt>
              <dd
                className="type-code mt-1 truncate text-ui-text"
                title={authorizationServerLabel(candidate)}
              >
                {authorizationServerLabel(candidate)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="type-micro-label text-ui-text-muted">
                {t('mcpServers.registrationMethod')}
              </dt>
              <dd className="type-caption mt-1 text-ui-text">
                {registrationMethodLabel(candidate)}
              </dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="type-micro-label text-ui-text-muted">
                {t('mcpServers.requestedScopes')}
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {candidate.scopes.length > 0
                  ? candidate.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="type-code rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-ui-text"
                      >
                        {scope}
                      </span>
                    ))
                  : (
                      <span className="type-caption text-ui-text-muted">
                        {t('mcpServers.scopesNotSpecified')}
                      </span>
                    )}
              </dd>
            </div>
          </dl>
        </div>
        {candidate.offlineAccessRequested && (
          <p className="type-caption mt-4 border-t border-ui-border pt-3 text-ui-text-muted">
            {t('mcpServers.offlineAccessDisclosure')}
          </p>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-ui-border bg-ui-bg px-4 py-3 text-sm text-ui-text">
        <Checkbox
          checked={consentGranted}
          disabled={disabled}
          onChange={(event) => onConsentChange(event.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>
          {t('mcpServers.oauthConsent', {
            origin: authorizationServerLabel(candidate)
          })}
        </span>
      </label>
    </>
  );
};

function requireSafeAuthorizationUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('The authorization server did not return a login URL.');
  }
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') {
    throw new Error('The authorization server returned an unsafe login URL.');
  }
  return parsed.toString();
}

export const McpOAuthDialog: React.FC<McpOAuthDialogProps> = ({
  serverName,
  returnPath,
  mode,
  retryAfterSeconds = 0,
  onClose,
  onPrepare,
  onStart
}) => {
  const { t } = useTranslation();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const errorId = React.useId();
  const preparedOnceRef = React.useRef(false);
  const [preparation, setPreparation] = React.useState<McpOAuthPreparation | null>(null);
  const [selectedIssuer, setSelectedIssuer] = React.useState('');
  const [consentGranted, setConsentGranted] = React.useState(false);
  const [preparing, setPreparing] = React.useState(true);
  const [starting, setStarting] = React.useState(false);
  const [operationError, setOperationError] = React.useState<unknown>(null);

  const prepare = React.useCallback(async () => {
    setPreparing(true);
    setOperationError(null);
    setPreparation(null);
    setConsentGranted(false);
    try {
      const result = await onPrepare(returnPath);
      if (!result || result.candidates.length === 0) {
        throw new Error(t('mcpServers.oauthNoAuthorizationServers'));
      }
      setPreparation(result);
      setSelectedIssuer(
        result.issuerSelectionRequired ? '' : result.candidates[0]?.issuer || ''
      );
    } catch (cause) {
      setOperationError(cause);
    } finally {
      setPreparing(false);
    }
  }, [onPrepare, returnPath, t]);

  React.useEffect(() => {
    if (preparedOnceRef.current) return;
    preparedOnceRef.current = true;
    void prepare();
  }, [prepare]);

  const selectedCandidate = preparation?.candidates.find(
    (candidate) => candidate.issuer === selectedIssuer
  );
  const canContinue = Boolean(
    preparation
    && selectedCandidate
    && consentGranted
    && !preparing
    && !starting
    && retryAfterSeconds === 0
  );
  const error = operationError
    ? formatMcpError(
        operationError,
        t('mcpServers.oauthPreparationFailed'),
        retryAfterSeconds
      ).message
    : '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinue || !preparation || !selectedCandidate) return;
    const authorizationTab = openMcpOAuthAuthorizationTab();
    if (!authorizationTab) {
      setOperationError(new Error(t('mcpServers.oauthPopupBlocked')));
      return;
    }
    setStarting(true);
    setOperationError(null);
    try {
      const authorizationUrl = requireSafeAuthorizationUrl(
        await onStart(
          preparation.preparationHandle,
          preparation.issuerSelectionRequired ? selectedCandidate.issuer : undefined
        )
      );
      authorizationTab.location.replace(authorizationUrl);
    } catch (cause) {
      authorizationTab.close();
      setOperationError(cause);
      setStarting(false);
    }
  };

  return (
    <Dialog
      titleId={titleId}
      closeDisabled={starting}
      onClose={onClose}
      className="w-full max-w-xl overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <form onSubmit={(event) => void submit(event)} aria-describedby={descriptionId}>
        <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-5">
          <div className="min-w-0">
            <div className="type-micro-label mb-2 flex items-center gap-2 text-ui-text-muted">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              {t('mcpServers.individualOAuth')}
            </div>
            <h2 id={titleId} className="type-section-title">
              {t(
                mode === 'reauthorize'
                  ? 'mcpServers.reauthorizeOAuthTitle'
                  : 'mcpServers.authorizeOAuthTitle',
                { name: serverName }
              )}
            </h2>
            <p id={descriptionId} className="type-caption mt-2 max-w-[68ch] text-ui-text-muted">
              {t('mcpServers.oauthDescription')}
            </p>
          </div>
          <CloseButton
            disabled={starting}
            onClick={onClose}
            aria-label={t('mcpServers.closeOAuthDialog')}
          />
        </div>

        <div className="space-y-5 px-6 py-5">
          {preparing && (
            <InlineLoadingIndicator
              label={t('mcpServers.oauthDiscovering')}
              className="w-full"
            />
          )}

          {preparation && !preparing && (
            <>
              {preparation.issuerSelectionRequired && (
                <div>
                  <label htmlFor="mcp-oauth-issuer" className="type-label block text-ui-text">
                    {t('mcpServers.authorizationServer')}
                  </label>
                  <Select<string>
                    id="mcp-oauth-issuer"
                    value={selectedIssuer}
                    options={[
                      { value: '', label: t('mcpServers.selectAuthorizationServer'), disabled: true },
                      ...preparation.candidates.map((candidate) => ({
                        value: candidate.issuer,
                        label: `${authorizationServerLabel(candidate)} · ${candidate.registrationMethod.toUpperCase()}`
                      }))
                    ]}
                    onChange={setSelectedIssuer}
                    ariaLabel={t('mcpServers.authorizationServer')}
                    className="mt-2"
                  />
                </div>
              )}

              {selectedCandidate && (
                <McpOAuthConsentReview
                  candidate={selectedCandidate}
                  consentGranted={consentGranted}
                  disabled={starting}
                  onConsentChange={setConsentGranted}
                />
              )}
            </>
          )}

          {error && (
            <div
              id={errorId}
              role="alert"
              className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ui-border bg-ui-bg px-6 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={starting}
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {error && !preparing && (
              <Button
                type="button"
                variant="secondary"
                disabled={starting || retryAfterSeconds > 0}
                onClick={() => void prepare()}
              >
                {retryAfterSeconds > 0
                  ? t('mcpServers.tryAgainIn', { seconds: retryAfterSeconds })
                  : t('common.retry')}
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={!canContinue}>
              {starting
                ? t('mcpServers.openingAuthorization')
                : (
                    <>
                      {t('mcpServers.continueToAuthorization')}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};
