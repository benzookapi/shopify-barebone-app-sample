import { redirect } from '../lib/http.server.js';
import { getAdminFromShop, normalizeShopDomain } from '../lib/shopify-auth.server.js';
import { buildStoredShopData, exchangeOAuthCode, getAppHandle } from '../lib/oauth.server.js';
import { verifyShopifyHmac } from '../lib/shopify-auth.server.js';
import { upsertShopData } from '../lib/shop-store.server.js';

export async function loader({ request }) {
  const params = new URL(request.url).searchParams;
  if (!verifyShopifyHmac(params)) {
    return new Response('HMAC verification failed', { status: 400 });
  }

  const shop = normalizeShopDomain(params.get('shop'));
  const code = params.get('code');
  if (!shop || !code) {
    return new Response('Missing or invalid shop or code', { status: 400 });
  }

  console.info('[oauth] callback received', JSON.stringify({ shop, hasCode: Boolean(code) }));

  const tokenResponse = await exchangeOAuthCode(shop, code);
  if (!tokenResponse.access_token) {
    return new Response('Shopify did not return an access token', { status: 502 });
  }
  console.info('[oauth] token exchange succeeded', JSON.stringify({
    shop,
    tokenPresent: true,
    tokenLength: tokenResponse.access_token.length,
    scope: tokenResponse.scope || '',
  }));

  try {
    await upsertShopData(shop, buildStoredShopData(shop, tokenResponse));
    console.info('[oauth] shop data stored', JSON.stringify({ shop }));
  } catch (error) {
    console.error('[oauth] shop data store failed', JSON.stringify({ shop, message: error.message }));
    throw error;
  }

  const appHandle = await getAppHandle(shop, tokenResponse.access_token);
  if (!appHandle) {
    return new Response('Unable to resolve app handle', { status: 502 });
  }

  return redirect(`https://${getAdminFromShop(shop)}/apps/${appHandle}`);
}
