import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';

interface NotFoundPageProps {
  isDark: boolean;
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 text-3xl font-bold text-ui-text">{t('notFound.title')}</h2>
      <p className="mb-6 text-sm text-ui-text-muted">
        {t('notFound.body')}
      </p>
      <Button onClick={onGoHome} variant="primary" size="sm">
        {t('notFound.action')}
      </Button>
    </div>
  );
};
