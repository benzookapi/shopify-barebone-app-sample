import test from 'node:test';
import assert from 'node:assert/strict';
import { isReauthorizationRequired, REFRESH_WINDOW_MS } from './offline-token.server.js';
import { SHOP, NOW, installation, memoryStore, tokenResponse, managerFor } from './token-test-helpers.js';

const due = () => installation({ access_token_expires_at: new Date(NOW + REFRESH_WINDOW_MS).toISOString() });

test('reuses a fresh token without locking or contacting Shopify', async () => {
  const store = memoryStore();
  const manager = managerFor(store, () => assert.fail('unexpected refresh'), { lock: () => assert.fail('unexpected lock') });
  assert.equal((await manager.get(SHOP)).access_token, 'old-access');
});

for (const lifetime of [REFRESH_WINDOW_MS, 60_000, -3600_000]) {
  test(`refreshes at the five-minute boundary or after expiry (${lifetime})`, async () => {
    const store = memoryStore(installation({ access_token_expires_at: new Date(NOW + lifetime).toISOString() }));
    const data = await managerFor(store, async (url, options) => {
      assert.equal(url, `https://${SHOP}/admin/oauth/access_token`);
      assert.equal(options.body.get('grant_type'), 'refresh_token');
      assert.equal(options.body.get('refresh_token'), 'old-refresh');
      assert.equal(options.body.get('client_id'), 'test-client');
      assert.equal(options.body.get('client_secret'), 'test-secret');
      assert.ok(options.signal instanceof AbortSignal);
      return tokenResponse();
    }).get(SHOP);
    assert.equal(data.access_token, 'new-access');
    assert.equal(data.refresh_token, 'new-refresh');
    assert.equal(data.access_token_expires_at, new Date(NOW + 3600_000).toISOString());
    assert.equal(data.refresh_token_expires_at, new Date(NOW + 90 * 86400_000).toISOString());
    assert.equal(data.scope, 'write_products');
    assert.notEqual(data.token_generation, 'old-generation');
    assert.deepEqual(store.records.get(SHOP), data);
  });
}

test('concurrent requests from separate managers rotate only once', async () => {
  const store = memoryStore(due());
  let count = 0;
  const fetchToken = async () => { count++; return tokenResponse(); };
  const a = managerFor(store, fetchToken);
  const b = managerFor(store, fetchToken);
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).get(SHOP)));
  assert.equal(count, 1);
  assert.ok(results.every((data) => data.refresh_token === 'new-refresh'));
});

test('authorization code acquisition and refresh use the same shop lock', async () => {
  const store = memoryStore(due());
  const grants = [];
  const fetchToken = async (_url, { body }) => {
    grants.push(body.get('code') ? 'code' : 'refresh');
    if (body.get('code')) {
      assert.equal(body.get('expiring'), '1');
      return tokenResponse({ access_token: 'authorized-access', refresh_token: 'authorized-refresh' });
    }
    return tokenResponse();
  };
  const a = managerFor(store, fetchToken);
  const b = managerFor(store, fetchToken);
  await Promise.all([a.authorize(SHOP, 'signed-code'), b.get(SHOP)]);
  assert.deepEqual(grants, ['code']);
  assert.equal(store.records.get(SHOP).refresh_token, 'authorized-refresh');
});

test('refresh followed by authorization persists the latest pair', async () => {
  const store = memoryStore(due());
  const grants = [];
  const a = managerFor(store, async () => { grants.push('refresh'); return tokenResponse(); });
  const b = managerFor(store, async () => { grants.push('code'); return tokenResponse({ refresh_token: 'authorized-refresh' }); });
  const refresh = a.get(SHOP);
  // Let get() enter the lock after loading the stored data.
  await Promise.resolve();
  await Promise.all([refresh, b.authorize(SHOP, 'signed-code')]);
  assert.deepEqual(grants, ['refresh', 'code']);
  assert.equal(store.records.get(SHOP).refresh_token, 'authorized-refresh');
});

test('different shops do not block each other', async () => {
  const store = memoryStore(due());
  const other = 'other.myshopify.com';
  store.records.set(other, due());
  let unblock;
  const a = managerFor(store, () => new Promise((resolve) => { unblock = () => resolve(tokenResponse()); }));
  const first = a.get(SHOP);
  await Promise.resolve(); await Promise.resolve();
  const second = await managerFor(store).get(other);
  assert.equal(second.access_token, 'new-access');
  unblock(); await first;
});

for (const invalid of [null, { access_token: 'legacy' }, installation({ client_id: 'other' }),
  installation({ refresh_token: '' }), installation({ access_token_expires_at: undefined }),
  installation({ refresh_token_expires_at: new Date(NOW).toISOString() })]) {
  test(`requires reauthorization for invalid installation ${JSON.stringify(invalid)}`, async () => {
    const manager = managerFor(memoryStore(invalid), () => assert.fail('unexpected token request'));
    await assert.rejects(manager.get(SHOP), isReauthorizationRequired);
  });
}

for (const status of [400, 401, 403, 429, 500, 503]) {
  test(`handles HTTP ${status} without logging credentials or overwriting the stored pair`, async () => {
    const original = due();
    const store = memoryStore(original);
    const manager = managerFor(store, async () => new Response('{"access_token":"do-not-log"}', { status }));
    await assert.rejects(manager.get(SHOP), (error) => {
      assert.ok(!error.message.includes('do-not-log'));
      assert.equal(isReauthorizationRequired(error), status === 401);
      assert.equal(error.status, status === 401 ? 401 : status >= 429 ? 503 : 502);
      return true;
    });
    assert.deepEqual(store.records.get(SHOP), original);
  });
}

test('invalid_grant during refresh requires reauthorization', async () => {
  const manager = managerFor(memoryStore(due()), async () => new Response('{"error":"invalid_grant"}', { status: 400 }));
  await assert.rejects(manager.get(SHOP), isReauthorizationRequired);
});

test('network failure preserves the pair and a later request can refresh', async () => {
  const store = memoryStore(due());
  const original = store.records.get(SHOP);
  const manager = managerFor(store, async () => { throw new Error('secret transport detail'); });
  await assert.rejects(manager.get(SHOP), { status: 503, message: 'Shopify token request failed or timed out. Retry the request.' });
  assert.deepEqual(store.records.get(SHOP), original);
  assert.equal((await managerFor(store).get(SHOP)).access_token, 'new-access');
});

test('rejects incomplete or malformed token responses', async () => {
  for (const response of [tokenResponse({ refresh_token: undefined }), tokenResponse({ expires_in: 0 }), new Response('not-json')]) {
    const store = memoryStore(due());
    await assert.rejects(managerFor(store, async () => response).get(SHOP), { status: 502 });
    assert.equal(store.records.get(SHOP).refresh_token, 'old-refresh');
  }
});

test('does not return a rotated token when persistence fails', async () => {
  const store = memoryStore(due());
  store.failSave = true;
  await assert.rejects(managerFor(store).get(SHOP), /Database unavailable/);
  assert.equal(store.records.get(SHOP).refresh_token, 'old-refresh');
});

test('commits rotated credentials even when a dependent delegated-token operation fails', async () => {
  const store = memoryStore(due());
  await assert.rejects(managerFor(store).withFreshToken(SHOP, async () => { throw new Error('Metafield unavailable'); }), /Metafield unavailable/);
  assert.equal(store.records.get(SHOP).refresh_token, 'new-refresh');
});

test('rejects invalid shop domains before sending credentials', async () => {
  await assert.rejects(managerFor(memoryStore(), () => assert.fail('unexpected request')).authorize('evil.example', 'code'), /Invalid Shopify shop/);
});
