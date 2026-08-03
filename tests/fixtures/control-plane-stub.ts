import { createServer } from 'node:http';

import { routeFixtureRequest } from '../../src/fixtures/router';

const port = Number(process.env.MCP_PARITY_API_PORT || 4190);
const appPort = Number(process.env.MCP_PARITY_APP_PORT || 4187);

for (const [name, value] of [['MCP_PARITY_API_PORT', port], ['MCP_PARITY_APP_PORT', appPort]] as const) {
  if (!Number.isInteger(value) || value < 1024 || value > 65_535) {
    throw new Error(`${name} must be an integer between 1024 and 65535.`);
  }
}
const allowedOrigin = `http://127.0.0.1:${appPort}`;

createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Expose-Headers', 'Retry-After');
  response.setHeader('Access-Control-Allow-Headers', 'content-type, x-csrf-token');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  headers.set('x-acornops-fixture-mode', 'mcp-parity');
  const body = Buffer.concat(chunks);
  const fixtureResponse = await routeFixtureRequest(new Request(
    `http://127.0.0.1:${port}${request.url || '/'}`,
    {
      method: request.method,
      headers,
      ...(body.length > 0 ? { body } : {})
    }
  ));
  response.statusCode = fixtureResponse.status;
  Object.entries(fixtureResponse.headers || {}).forEach(([name, value]) => response.setHeader(name, value));
  if (fixtureResponse.body === undefined) {
    response.end();
  } else {
    response.end(JSON.stringify(fixtureResponse.body));
  }
}).listen(port, '127.0.0.1');
