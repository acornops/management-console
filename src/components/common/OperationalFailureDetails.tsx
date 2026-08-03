import React from 'react';
import { useTranslation } from 'react-i18next';

export function operationalFailureCause(error: string, fallback: string): string {
  const withoutCode = error.trim().replace(/^[A-Z][A-Z0-9_]{2,63}:\s*/, '').trim();
  if (!withoutCode) return fallback;
  if (/^[A-Z][A-Z0-9_]{2,63}$/.test(withoutCode)) return fallback;
  const firstSentence = withoutCode.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || withoutCode;
  return firstSentence.slice(0, 240);
}

export const OperationalFailureDetails: React.FC<{
  cause: string;
  impact: string;
  nextStep: string;
  technicalDetail?: string;
  action?: React.ReactNode;
  tone?: 'danger' | 'warning';
}> = ({ cause, impact, nextStep, technicalDetail, action, tone = 'danger' }) => {
  const { t } = useTranslation();
  const textClassName = tone === 'warning' ? 'text-status-warning-text' : 'text-status-danger-text';
  return (
    <div className={`mt-3 max-w-3xl type-caption ${textClassName}`} data-operational-failure="true">
      <dl className="grid gap-2">
        <div>
          <dt className="type-micro-label">{t('operationalFailure.cause')}</dt>
          <dd className="mt-0.5">{cause}</dd>
        </div>
        <div>
          <dt className="type-micro-label">{t('operationalFailure.impact')}</dt>
          <dd className="mt-0.5">{impact}</dd>
        </div>
        <div>
          <dt className="type-micro-label">{t('operationalFailure.nextStep')}</dt>
          <dd className="mt-0.5">{nextStep}</dd>
        </div>
      </dl>
      {action && <div className="mt-3">{action}</div>}
      {technicalDetail && (
        <details className="mt-2">
          <summary className="cursor-pointer type-emphasis underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary">
            {t('operationalFailure.technicalDetails')}
          </summary>
          <code className="mt-2 block whitespace-pre-wrap break-words rounded-md border border-current/20 bg-ui-bg px-3 py-2 text-ui-text-muted">
            {technicalDetail}
          </code>
        </details>
      )}
    </div>
  );
};
