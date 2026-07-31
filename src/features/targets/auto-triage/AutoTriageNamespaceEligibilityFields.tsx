import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  FieldValidationMessage,
  Switch,
  TextInput,
  fieldInvalidClass,
  formInputClassName
} from '@acornops/ui';
import {
  AUTO_TRIAGE_NAMESPACE_INPUT_MAX_CHARACTERS,
  type AutoTriageNamespaceValidationError
} from './autoTriageNamespaceValidation';

const namespaceInputClassName = formInputClassName('type-body');

export const AutoTriageNamespaceEligibilityFields: React.FC<{
  targetId: string;
  canEdit: boolean;
  namespaceIncludeText: string;
  namespaceExcludeText: string;
  includeClusterScopedIssues: boolean;
  namespaceIncludeError?: AutoTriageNamespaceValidationError;
  namespaceExcludeError?: AutoTriageNamespaceValidationError;
  onNamespaceIncludeTextChange: (value: string) => void;
  onNamespaceExcludeTextChange: (value: string) => void;
  onIncludeClusterScopedIssuesChange: (value: boolean) => void;
}> = ({
  targetId,
  canEdit,
  namespaceIncludeText,
  namespaceExcludeText,
  includeClusterScopedIssues,
  namespaceIncludeError,
  namespaceExcludeError,
  onNamespaceIncludeTextChange,
  onNamespaceExcludeTextChange,
  onIncludeClusterScopedIssuesChange
}) => {
  const { t } = useTranslation();
  const clusterScopeHelpId = `auto-triage-cluster-scope-help-${targetId}`;
  const includeId = `auto-triage-namespace-include-${targetId}`;
  const includeHelpId = `${includeId}-help`;
  const includeErrorId = `${includeId}-error`;
  const excludeId = `auto-triage-namespace-exclude-${targetId}`;
  const excludeHelpId = `${excludeId}-help`;
  const excludeErrorId = `${excludeId}-error`;
  const validationMessage = (error?: AutoTriageNamespaceValidationError) => error
    ? t(error === 'too_many' ? 'autoTriage.namespaceTooMany' : 'autoTriage.namespaceInvalid')
    : undefined;
  const includeError = validationMessage(namespaceIncludeError);
  const excludeError = validationMessage(namespaceExcludeError);
  return (
    <div className="grid gap-5 border-b border-ui-border p-6">
      <div>
        <p className="type-body type-emphasis text-ui-text">{t('autoTriage.namespaceEligibility')}</p>
        <p className="type-caption mt-1 max-w-3xl leading-5 text-ui-text-muted">
          {t('autoTriage.namespaceEligibilityHelp')}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <label htmlFor={includeId} className="type-body type-emphasis text-ui-text">
            {t('autoTriage.namespaceInclude')}
          </label>
          <p id={includeHelpId} className="type-caption leading-5 text-ui-text-muted">
            {t('autoTriage.namespaceIncludeHelp')}
          </p>
          <TextInput
            id={includeId}
            value={namespaceIncludeText}
            disabled={!canEdit}
            maxLength={AUTO_TRIAGE_NAMESPACE_INPUT_MAX_CHARACTERS}
            placeholder={t('autoTriage.namespaceIncludePlaceholder')}
            aria-describedby={`${includeHelpId}${includeError ? ` ${includeErrorId}` : ''}`}
            aria-invalid={Boolean(includeError)}
            className={`${namespaceInputClassName} ${includeError ? fieldInvalidClass : ''}`}
            onChange={(event) => onNamespaceIncludeTextChange(event.target.value)}
          />
          <FieldValidationMessage id={includeErrorId} message={includeError} />
        </div>
        <div className="grid content-start gap-2">
          <label htmlFor={excludeId} className="type-body type-emphasis text-ui-text">
            {t('autoTriage.namespaceExclude')}
          </label>
          <p id={excludeHelpId} className="type-caption leading-5 text-ui-text-muted">
            {t('autoTriage.namespaceExcludeHelp')}
          </p>
          <TextInput
            id={excludeId}
            value={namespaceExcludeText}
            disabled={!canEdit}
            maxLength={AUTO_TRIAGE_NAMESPACE_INPUT_MAX_CHARACTERS}
            placeholder={t('autoTriage.namespaceExcludePlaceholder')}
            aria-describedby={`${excludeHelpId}${excludeError ? ` ${excludeErrorId}` : ''}`}
            aria-invalid={Boolean(excludeError)}
            className={`${namespaceInputClassName} ${excludeError ? fieldInvalidClass : ''}`}
            onChange={(event) => onNamespaceExcludeTextChange(event.target.value)}
          />
          <FieldValidationMessage id={excludeErrorId} message={excludeError} />
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-ui-border pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="type-body type-emphasis text-ui-text">{t('autoTriage.clusterScopedIssues')}</p>
          <p id={clusterScopeHelpId} className="type-caption mt-1 max-w-3xl leading-5 text-ui-text-muted">
            {t('autoTriage.clusterScopedIssuesHelp')}
          </p>
        </div>
        <Switch
          checked={includeClusterScopedIssues}
          label={t('autoTriage.clusterScopedIssues')}
          aria-describedby={clusterScopeHelpId}
          disabled={!canEdit}
          onCheckedChange={onIncludeClusterScopedIssuesChange}
        />
      </div>
    </div>
  );
};
