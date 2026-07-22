import { setupWorker } from 'msw/browser';
import { activateFrontendFixtureRuntime } from '@/config/appDataMode';
import { fixtureHandlers } from './handlers';

const worker = setupWorker(...fixtureHandlers);

export async function startFixtureWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        print.error();
        throw new Error(
          `Fixture mode blocked an unmatched API request: ${request.method} ${url.pathname}${url.search}`
        );
      }
    },
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`
    }
  });
  activateFrontendFixtureRuntime();
}
