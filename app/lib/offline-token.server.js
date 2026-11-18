import { randomUUID } from 'node:crypto';
import { API_KEY, API_SECRET, API_VERSION } from './env.server.js';
import { getShopData, withLockedShopData } from './shop-store.server.js';
import { normalizeShopDomain } from './shopify-auth.server.js';

export const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export class ReauthorizationRequiredError extends Error {
  constructor() {
    super('Open the app from Shopify Admin again to authorize this installation.');
    this.name = 'ReauthorizationRequiredError';
    this.code = 'SHOPIFY_REAUTHORIZATION_REQUIRED';
    this.status = 401;
  }
}

export function isReauthorizationRequired(error) {
  return error?.code === 'SHOPIFY_REAUTHORIZATION_REQUIRED';
}

// Dependencies are injectable so rotation and cross-process races can be tested offline.
export function createOfflineTokenManager({
  clientId = API_KEY,
  clientSecret = API_SECRET,
  apiVersion = API_VERSION,
  load = getShopData,
  lock = withLockedShopData,
  fetchToken = (...args) => fetch(...args),
  now = Date.now,
} = {}) {
  function requireInstallation(data) {
    if (!clientId || data?.client_id !== clientId || !data.access_token || !data.refresh_token
      || !Number.isFinite(Date.parse(data.access_token_expires_at))
      || !Number.isFinite(Date.parse(data.refresh_token_expires_at))
      || Date.parse(data.refresh_token_expires_at) <= now()) {
      throw new ReauthorizationRequiredError();
    }
  }

  function fresh(data) {
    requireInstallation(data);
    return Date.parse(data.access_token_expires_at) - now() > REFRESH_WINDOW_MS;
  }

  async function requestPair(shop, parameters, previous = {}) {
    if (!clientId || !clientSecret) throw new Error('Shopify app credentials are missing.');
    // Use the request start time so network latency never extends the stored lifetime.
    const issuedAt = now();
    let response;
    let payload;
    try {
      response = await fetchToken(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...parameters }),
        signal: AbortSignal.timeout(12_000),
      });
      // Never include an OAuth response body or fetch error in diagnostics: it may contain tokens.
      payload = await response.json().catch(() => null);
    } catch {
      throw tokenError('Shopify token request failed or timed out. Retry the request.', 503);
    }
    if (!response.ok) {
      if (parameters.grant_type === 'refresh_token' && (response.status === 401
        || (response.status === 400 && payload?.error === 'invalid_grant'))) {
        throw new ReauthorizationRequiredError();
      }
      throw tokenError(`Shopify token request failed (HTTP ${response.status}).`,
        response.status === 429 || response.status >= 500 ? 503 : 502);
    }
    if (typeof payload?.access_token !== 'string' || !payload.access_token
      || typeof payload.refresh_token !== 'string' || !payload.refresh_token
      || !Number.isFinite(payload.expires_in) || payload.expires_in <= 0
      || !Number.isFinite(payload.refresh_token_expires_in) || payload.refresh_token_expires_in <= 0) {
      throw tokenError('Shopify did not return a complete expiring offline token pair.', 502);
    }
    return {
      ...previous,
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      scope: payload.scope ?? previous.scope ?? '',
      expires_in: payload.expires_in,
      refresh_token_expires_in: payload.refresh_token_expires_in,
      access_token_expires_at: new Date(issuedAt + payload.expires_in * 1000).toISOString(),
      refresh_token_expires_at: new Date(issuedAt + payload.refresh_token_expires_in * 1000).toISOString(),
      shop,
      client_id: clientId,
      api_version: apiVersion,
      stored_at: new Date(issuedAt).toISOString(),
      token_generation: randomUUID(),
    };
  }

  async function refreshLocked(shop, data, save) {
    if (fresh(data)) return data;
    const next = await requestPair(shop, { grant_type: 'refresh_token', refresh_token: data.refresh_token }, data);
    await save(next); // Stage the complete pair; the lock wrapper commits before returning.
    return next;
  }

  return {
    async get(shop) {
      const key = requireShop(shop);
      const data = await load(key);
      if (fresh(data)) return data;
      return lock(key, (current, save) => refreshLocked(key, current, save));
    },
    async authorize(shop, code) {
      const key = requireShop(shop);
      return lock(key, async (_current, save) => {
        const data = await requestPair(key, { code, expiring: '1' });
        await save(data);
        return data;
      });
    },
    // Dependent delegated tokens must be created under the same lock as parent rotation.
    async withFreshToken(shop, handler) {
      const key = requireShop(shop);
      const outcome = await lock(key, async (current, save) => {
        const data = await refreshLocked(key, current, save);
        // Commit a rotated pair even when a dependent API operation fails.
        try {
          return { value: await handler(data) };
        } catch (error) {
          return { error };
        }
      });
      if (outcome.error) throw outcome.error;
      return outcome.value;
    },
  };
}

function requireShop(shop) {
  const key = normalizeShopDomain(shop);
  if (!key) throw new Error('Invalid Shopify shop domain.');
  return key;
}

function tokenError(message, status) {
  return Object.assign(new Error(message), { status });
}

const manager = createOfflineTokenManager();
export const getOfflineShopData = manager.get;
export const authorizeOfflineShop = manager.authorize;
export const withFreshOfflineToken = manager.withFreshToken;
