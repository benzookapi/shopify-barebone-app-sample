import { createOfflineTokenManager } from './offline-token.server.js';

export const SHOP = 'sample.myshopify.com';
export const NOW = Date.parse('2026-11-18T00:00:00Z');
export function installation(overrides = {}) {
  return {
    shop: SHOP,
    client_id: 'test-client',
    access_token: 'old-access',
    refresh_token: 'old-refresh',
    token_generation: 'old-generation',
    access_token_expires_at: new Date(NOW + 3600_000).toISOString(),
    refresh_token_expires_at: new Date(NOW + 86400_000).toISOString(),
    scope: 'write_products',
    ...overrides,
  };
}

// Each manager gets its own dependencies but shares transactional storage, like Render processes.
export function memoryStore(initial = installation()) {
  const records = new Map([[SHOP, initial]]);
  const pending = new Map();
  let failSave = false;
  return {
    records,
    set failSave(value) { failSave = value; },
    load: async (shop) => structuredClone(records.get(shop)),
    async lock(shop, handler) {
      const before = pending.get(shop) || Promise.resolve();
      let release;
      pending.set(shop, new Promise((resolve) => { release = resolve; }));
      await before;
      let saved;
      try {
        const result = await handler(structuredClone(records.get(shop)), async (next) => {
          if (failSave) throw new Error('Database unavailable');
          saved = structuredClone(next);
        });
        if (saved) records.set(shop, saved);
        return result;
      } finally { release(); }
    },
  };
}

export function tokenResponse(overrides = {}) {
  return new Response(JSON.stringify({
    access_token: 'new-access',
    refresh_token: 'new-refresh',
    expires_in: 3600,
    refresh_token_expires_in: 90 * 86400,
    ...overrides,
  }), { headers: { 'Content-Type': 'application/json' } });
}

export function managerFor(store, fetchToken = async () => tokenResponse(), overrides = {}) {
  return createOfflineTokenManager({
    clientId: 'test-client', clientSecret: 'test-secret', now: () => NOW,
    load: store.load, lock: store.lock, fetchToken, ...overrides,
  });
}
