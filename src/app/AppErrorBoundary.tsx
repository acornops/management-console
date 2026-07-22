import React from 'react';
import { Button } from '@/components/common/Button';
import { reportBrowserError } from '@/observability/browserErrors';

export const AppRecoveryScreen: React.FC = () => (
  <main className="flex min-h-screen items-center justify-center bg-ui-bg px-6 text-ui-text">
    <section className="w-full max-w-md rounded-xl border border-ui-border bg-ui-surface p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold">The console hit an unexpected problem</h1>
      <p className="mt-2 text-sm text-ui-text-muted">Your credentials and request details have not been shown. Reload the page or return to the console home.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>Reload</Button>
        <Button variant="secondary" onClick={() => window.location.assign(import.meta.env.BASE_URL || '/')}>Return to console</Button>
      </div>
    </section>
  </main>
);

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
