import {
  decodeSessionToken,
  getBearerToken,
  getShopFromSessionToken,
  verifySessionToken,
} from './shopify-auth.server.js';
import { isCurrentAppInstallation } from './oauth.server.js';
import { getShopData } from './shop-store.server.js';

export function getAuthenticatedFetchContext(request) {
  const token = getBearerToken(request);
  const verified = verifySessionToken(token);
  const signature = token ? token.split('.')[2] : '';
  if (!verified) {
    return {
      ok: false,
      token,
      signature,
      response: {
        result: {
          message: 'Signature unmatched. Incorrect authentication bearer sent',
        },
      },
      status: 400,
    };
  }

  const shop = getShopFromSessionToken(token);
  if (!shop) {
    return {
      ok: false,
      token,
      signature,
      response: {
        result: {
          message: 'Authorization failed. Invalid shop in session token',
        },
      },
      status: 400,
    };
  }

  return {
    ok: true,
    token,
    signature,
    shop,
    payload: decodeSessionToken(token),
  };
}

export async function requireAuthenticatedShop(request) {
  const context = getAuthenticatedFetchContext(request);
  if (!context.ok) {
    return context;
  }

  const shopData = await getShopData(context.shop);
  if (shopData == null) {
    return {
      ok: false,
      status: 400,
      response: {
        result: {
          message: 'Authorization failed. No shop data',
        },
      },
    };
  }

  if (!isCurrentAppInstallation(shopData)) {
    return {
      ok: false,
      status: 401,
      response: {
        result: {
          message: 'Authorization failed. Stored OAuth data is missing or belongs to a different app client. Reload the embedded app to restart OAuth.',
        },
      },
    };
  }

  return {
    ...context,
    shopData,
  };
}
