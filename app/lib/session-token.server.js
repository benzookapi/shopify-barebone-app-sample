import {
  decodeSessionToken,
  getBearerToken,
  getShopFromSessionToken,
  verifySessionToken,
} from './shopify-auth.server.js';
import { getOfflineShopData, isReauthorizationRequired } from './offline-token.server.js';

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

  let shopData;
  try {
    shopData = await getOfflineShopData(context.shop);
  } catch (error) {
    if (!isReauthorizationRequired(error)) throw error;
    return {
      ok: false,
      status: 401,
      response: { result: { message: error.message } },
    };
  }

  return {
    ...context,
    shopData,
  };
}
