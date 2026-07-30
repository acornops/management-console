import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, PageShell } from '@acornops/ui';

interface NotFoundPageProps {
  isDark: boolean;
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  const { t } = useTranslation();
  return (
    <PageShell>
      <div className="flex min-h-full flex-col items-center justify-center text-center">
        <h2 className="mb-2 type-route-title">{t('notFound.title')}</h2>
        <p className="mb-6 type-body text-ui-text-muted">
          {t('notFound.body')}
        </p>
        <Button onClick={onGoHome} variant="primary" size="sm">
          {t('notFound.action')}
        </Button>
      </div>
    </PageShell>
  );
};
