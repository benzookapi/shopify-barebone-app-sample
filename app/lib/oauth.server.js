import {
  API_KEY,
  API_SECRET,
} from './env.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';
import { getShopData } from './shop-store.server.js';
import { isReauthorizationRequired } from './offline-token.server.js';
import { normalizeShopDomain } from './shopify-auth.server.js';

const APP_HANDLE_QUERY = `query AppHandle {
  app {
    handle
  }
}`;

const SHOP_QUERY = `query InstalledShop {
  shop {
    name
  }
  app {
    handle
  }
}`;

export async function hasValidInstallation(shop) {
  if (!API_KEY || !API_SECRET) return false;
  const shopDomain = normalizeShopDomain(shop);
  if (!shopDomain) return false;
  const shopData = await getShopData(shopDomain);
  const currentAppInstallation = isCurrentAppInstallation(shopData);
  console.info('[oauth] stored installation', JSON.stringify({
    shop: shopDomain,
    ...summarizeShopData(shopData),
    currentAppInstallation,
  }));
  if (!currentAppInstallation) return false;
  try {
    const response = await callAdminGraphql(shopDomain, SHOP_QUERY);
    return response.data?.shop?.name != null && response.data?.app?.handle != null;
  } catch (error) {
    console.info('[oauth] stored token rejected', JSON.stringify({
      shop: shopDomain,
      status: error.status || null,
      message: error.message,
    }));
    if (isReauthorizationRequired(error) || error.status === 401) return false;
    throw error;
  }
}

export async function getAppHandle(shop, accessToken) {
  const response = await callAdminGraphql(shop, APP_HANDLE_QUERY, null, accessToken);
  return response.data?.app?.handle;
}

export function createOAuthAuthorizeUrl(shop, origin) {
  const shopDomain = normalizeShopDomain(shop);
  const redirectUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  redirectUrl.searchParams.set('client_id', API_KEY);
  redirectUrl.searchParams.set('redirect_uri', `${origin}/callback`);
  redirectUrl.searchParams.set('state', '');
  redirectUrl.searchParams.append('grant_options[]', '');
  return redirectUrl.toString();
}

export function isCurrentAppInstallation(shopData) {
  return Boolean(shopData?.access_token && shopData.client_id === API_KEY);
}

function summarizeShopData(shopData) {
  const accessToken = shopData?.access_token || '';
  return {
    exists: shopData != null,
    clientId: shopData?.client_id || '',
    legacyScope: shopData?.scope || '',
    storedAt: shopData?.stored_at || '',
    tokenPresent: Boolean(accessToken),
    tokenLength: accessToken.length,
  };
}
