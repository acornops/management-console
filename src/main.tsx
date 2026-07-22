
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './fonts';
import { AppErrorBoundary } from './app/AppErrorBoundary';
import { getAppDataMode } from './config/appDataMode';
import { initializeI18n } from './i18n';
import './styles.css';
import { registerGlobalBrowserErrorHandlers, reportBrowserError } from './observability/browserErrors';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
registerGlobalBrowserErrorHandlers();

async function startApplication(): Promise<void> {
  if (import.meta.env.DEV && getAppDataMode() === 'mock') {
    const { startFixtureWorker } = await import('./fixtures/browser');
    await startFixtureWorker();
  }
  await initializeI18n();
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </MotionConfig>
    </React.StrictMode>
  );
}

void startApplication().catch((error: unknown) => {
  reportBrowserError(error, 'startup');
  rootElement.textContent = 'Management console could not start. Reload the page or return to the console home.';
});
