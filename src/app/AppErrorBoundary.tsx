import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button } from '@acornops/ui';
import { reportBrowserError } from '@/observability/browserErrors';

export const AppRecoveryScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen items-center justify-center bg-ui-bg px-6 text-ui-text">
      <section className="w-full max-w-md rounded-xl border border-ui-border bg-ui-surface p-8 text-center shadow-sm">
        <h1 className="type-route-title ">{t('appRecovery.errorTitle')}</h1>
        <p className="mt-2 type-body text-ui-text-muted">{t('appRecovery.errorBody')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>{t('appRecovery.reload')}</Button>
          <Button variant="secondary" onClick={() => window.location.assign(import.meta.env.BASE_URL || '/')}>{t('appRecovery.returnHome')}</Button>
        </div>
      </section>
    </main>
  );
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    reportBrowserError(error, 'react-boundary');
  }

  render(): React.ReactNode {
    return this.state.failed ? <AppRecoveryScreen /> : this.props.children;
  }
}
