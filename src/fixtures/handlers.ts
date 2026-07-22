import { http } from 'msw';
import { routeFixtureRequest } from './router';

export const fixtureHandlers = [
  http.all(/\/api\/v1\/.*/, async ({ request }) => {
    const fixtureParams = new URLSearchParams(window.location.search);
    const delayMs = Number(fixtureParams.get('fixtureDelayMs') || 0);
    const delayPath = fixtureParams.get('fixtureDelayPath') || '';
    const failurePaths = (fixtureParams.get('fixtureFailurePath') || '').split(',').filter(Boolean);
    if (failurePaths.some((failurePath) => new URL(request.url).pathname.includes(failurePath))) {
      return Response.json(
        { error: { code: 'FIXTURE_FORCED_FAILURE', message: 'This collection is temporarily unavailable in fixture mode.' } },
        { status: 503 }
      );
    }
    if (delayMs > 0 && delayPath && new URL(request.url).pathname.includes(delayPath)) {
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(delayMs, 5000)));
    }
    const response = await routeFixtureRequest(request);
    const headers = new Headers(response.headers);
    if (response.body === undefined) {
      return new Response(null, { status: response.status, headers });
    }
    if (headers.get('content-type') === 'text/event-stream') {
      return new Response(String(response.body), { status: response.status, headers });
    }
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(response.body), { status: response.status, headers });
  })
];
