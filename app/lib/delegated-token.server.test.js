import test from 'node:test';
import assert from 'node:assert/strict';
import { createDelegatedTokenManager } from './delegated-token.server.js';
import { SHOP, NOW, installation, memoryStore, managerFor } from './token-test-helpers.js';

function fixture(initial, parent = installation()) {
  let value = initial ? JSON.stringify(initial) : null;
  const calls = [];
  const store = memoryStore(parent);
  const offline = managerFor(store);
  const manager = createDelegatedTokenManager({
    now: () => NOW,
    withFreshToken: offline.withFreshToken,
    async callAdmin(shop, query, variables, accessToken) {
      assert.equal(shop, SHOP);
      assert.equal(accessToken, store.records.get(SHOP).access_token === 'old-access'
        && Date.parse(parent.access_token_expires_at) - NOW > 300_000 ? 'old-access' : 'new-access');
      calls.push({ query, variables });
      if (query.includes('query BareboneDelegatedToken')) {
        return { data: { shop: { metafield: value ? { value } : null } } };
      }
      if (query.includes('mutation DelegateAccessTokenCreate')) {
        return { data: { delegateAccessTokenCreate: {
          delegateAccessToken: { accessToken: 'delegated-new' }, shop: { id: 'gid://shopify/Shop/1' }, userErrors: [],
        } } };
      }
      value = variables.metafields[0].value;
      return { data: { metafieldsSet: { metafields: [{ value }], userErrors: [] } } };
    },
  });
  return { manager, calls, store };
}

function delegated(overrides = {}) {
  return { accessToken: 'delegated-old', parent_token_generation: 'old-generation',
    expires_at: new Date(NOW + 3500_000).toISOString(), ...overrides };
}

test('reuses a delegated token for the current unexpired parent generation', async () => {
  const { manager, calls } = fixture(delegated());
  assert.equal((await manager.get(SHOP)).accessToken, 'delegated-old');
  assert.equal(calls.length, 1);
});

for (const token of [delegated({ expires_at: new Date(NOW + 60_000).toISOString() }),
  delegated({ parent_token_generation: 'retired-parent' }), { accessToken: 'legacy' }]) {
  test('regenerates expired, legacy, or parent-invalidated delegated tokens', async () => {
    const { manager, calls } = fixture(token);
    const result = await manager.get(SHOP);
    assert.equal(result.accessToken, 'delegated-new');
    assert.equal(calls.length, 3);
    assert.equal(calls[1].variables.input.expiresIn, 3540);
    assert.equal(result.expires_at, new Date(NOW + 3540_000).toISOString());
    assert.equal(result.parent_token_generation, 'old-generation');
    assert.equal(JSON.parse(calls[2].variables.metafields[0].value).accessToken, 'delegated-new');
  });
}

test('refreshes the parent before creating a dependent delegated token', async () => {
  const parent = installation({ access_token_expires_at: new Date(NOW - 1000).toISOString() });
  const { manager, store } = fixture(delegated(), parent);
  const result = await manager.get(SHOP);
  assert.equal(result.parent_token_generation, store.records.get(SHOP).token_generation);
  assert.equal(store.records.get(SHOP).access_token, 'new-access');
});

test('keeps the explicit Prepare tokens requirement for unprepared shops', async () => {
  const { manager, calls } = fixture(null);
  await assert.rejects(manager.get(SHOP), (error) => error instanceof Response && error.status === 400);
  assert.equal(calls.length, 1);
});

test('serializes simultaneous delegated token regeneration', async () => {
  const { manager, calls } = fixture(delegated({ parent_token_generation: 'retired' }));
  const results = await Promise.all([manager.get(SHOP), manager.get(SHOP)]);
  assert.ok(results.every((token) => token.accessToken === 'delegated-new'));
  assert.equal(calls.filter(({ query }) => query.includes('mutation DelegateAccessTokenCreate')).length, 1);
});

test('reports delegated token API failure without returning private credentials', async () => {
  const manager = createDelegatedTokenManager({
    now: () => NOW,
    withFreshToken: (_shop, handler) => handler(installation()),
    callAdmin: async () => ({ data: { delegateAccessTokenCreate: { userErrors: [{ message: 'failure' }] } } }),
  });
  await assert.rejects(manager.create(SHOP), /Unable to create the delegated Storefront token/);
});
