import path from 'node:path';
import { createRequestHandler } from '@react-router/express';
import express from 'express';
import {
  handlePostPurchaseAction,
  postPurchaseCorsHeaders,
} from './app/lib/post-purchase.server.js';

const build = await import('./build/server/index.js');
const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    console.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt} ms`);
  });
  next();
});

// React Router rejects OPTIONS before route loaders run, so handle this
// session-token endpoint before delegating the remaining routes.
app.options('/postpurchase', (_request, response) => {
  response.status(204).set(postPurchaseCorsHeaders).end();
});

app.post('/postpurchase', async (request, response) => {
  try {
    const webRequest = new Request(`${request.protocol}://${request.get('host')}${request.originalUrl}`, {
      method: 'POST',
      headers: {
        Authorization: request.get('authorization') || '',
      },
    });
    const webResponse = await handlePostPurchaseAction(webRequest);

    response.status(webResponse.status);
    webResponse.headers.forEach((value, key) => response.setHeader(key, value));
    response.send(await webResponse.text());
  } catch (error) {
    console.error('[postpurchase] request failed', error);
    response.status(500).set(postPurchaseCorsHeaders).json({ error: 'Post-purchase request failed' });
  }
});

app.use('/assets', express.static(path.resolve('build/client/assets'), {
  immutable: true,
  maxAge: '1y',
}));
app.use(express.static(path.resolve('build/client'), { maxAge: '1h' }));
app.use(express.static(path.resolve('public'), { maxAge: '1h' }));
app.all('*', createRequestHandler({ build, mode: process.env.NODE_ENV }));

const server = app.listen(port, () => {
  console.log(`[server] http://localhost:${port}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => server.close(console.error));
}
