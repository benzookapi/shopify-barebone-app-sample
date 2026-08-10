import { randomBytes, createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  CONTENT_TYPE_FORM,
  CONTENT_TYPE_JSON,
  CUSTOMER_ACCOUNT_CLIENT_ID,
  CUSTOMER_ACCOUNT_SCOPE,
  CUSTOMER_ACCOUNT_SESSION_COOKIE,
  USER_AGENT,
} from './env.server.js';
import { getPublicOrigin } from './public-url.server.js';

const pendingStates = new Map();
const sessions = new Map();

export function requireCustomerAccountClientId() {
  if (!CUSTOMER_ACCOUNT_CLIENT_ID) {
    throw new Response('SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID is not configured', { status: 500 });
  }
}

export async function startCustomerAccountLogin({ request, shop, publicToken }) {
  requireCustomerAccountClientId();

  const url = new URL(request.url);
  const authConfig = await discoverCustomerAccountAuthConfig(shop);
  const state = uuidv4();
  const nonce = uuidv4();
  const verifier = createPkceVerifier();
  const challenge = createPkceChallenge(verifier);
  const returnTo = url.searchParams.get('return_to') || `/storefront/plain?shop=${shop}&public_token=${publicToken || ''}`;
  const redirectUri = `${getPublicOrigin(request)}/customer-account/callback`;

  pendingStates.set(state, {
    shop,
    nonce,
    verifier,
    redirectUri,
    returnTo,
    createdAt: Date.now(),
  });
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

  const authorizationUrl = new URL(authConfig.authorization_endpoint);
  authorizationUrl.searchParams.set('scope', CUSTOMER_ACCOUNT_SCOPE);
  authorizationUrl.searchParams.set('client_id', CUSTOMER_ACCOUNT_CLIENT_ID);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('nonce', nonce);
  authorizationUrl.searchParams.set('code_challenge', challenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');

  return authorizationUrl.toString();
}

export async function completeCustomerAccountLogin(request) {
  requireCustomerAccountClientId();

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const origin = getPublicOrigin(request);
  if (!code || !state) {
    throw new Response('Missing code or state', { status: 400 });
  }

  const pending = pendingStates.get(state);
  pendingStates.delete(state);
  if (pending == null) {
    console.info('[customer-account] callback state rejected', JSON.stringify({
      statePresent: Boolean(state),
      codePresent: Boolean(code),
    }));
    throw new Response('Invalid or expired state', { status: 400 });
  }

  const authConfig = await discoverCustomerAccountAuthConfig(pending.shop);
  const tokenBody = new URLSearchParams();
  tokenBody.set('grant_type', 'authorization_code');
  tokenBody.set('client_id', CUSTOMER_ACCOUNT_CLIENT_ID);
  tokenBody.set('redirect_uri', pending.redirectUri);
  tokenBody.set('code', code);
  tokenBody.set('code_verifier', pending.verifier);

  console.info('[customer-account] token request', JSON.stringify({
    shop: pending.shop,
    endpoint: authConfig.token_endpoint,
    redirectUri: pending.redirectUri,
    origin,
    codePresent: Boolean(code),
  }));

  const tokenResponse = await fetch(authConfig.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPE_FORM,
      'User-Agent': USER_AGENT,
      Origin: origin,
    },
    body: tokenBody,
  });
  const tokenText = await tokenResponse.text();
  logCustomerAccountResponse('token response', tokenResponse, tokenText);
  if (!tokenResponse.ok) {
    throw new Response(`Customer Account API token exchange failed: ${tokenText}`, {
      status: 502,
    });
  }

  const tokenJson = parseCustomerAccountJson(tokenText, 'token response');
  if (!tokenJson.access_token) {
    console.info('[customer-account] token response missing access token', JSON.stringify({
      shop: pending.shop,
      keys: Object.keys(tokenJson),
    }));
    throw new Response('Customer Account API token exchange did not return access_token', {
      status: 502,
    });
  }
  console.info('[customer-account] token accepted', JSON.stringify({
    shop: pending.shop,
    hasAccessToken: Boolean(tokenJson.access_token),
    accessTokenPrefix: getTokenPrefix(tokenJson.access_token),
    hasRefreshToken: Boolean(tokenJson.refresh_token),
    refreshTokenPrefix: getTokenPrefix(tokenJson.refresh_token),
    idTokenPrefix: getTokenPrefix(tokenJson.id_token),
    expiresIn: tokenJson.expires_in || null,
  }));

  const profile = await getCustomerAccountProfile(pending.shop, tokenJson.access_token, origin);
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    shop: pending.shop,
    profile,
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt: Date.now() + (tokenJson.expires_in || 3600) * 1000,
  });

  return {
    returnTo: pending.returnTo,
    sessionId,
  };
}

export function getCustomerAccountSession(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const sessionId = cookies[CUSTOMER_ACCOUNT_SESSION_COOKIE];
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (session == null) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function deleteCustomerAccountSession(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const sessionId = cookies[CUSTOMER_ACCOUNT_SESSION_COOKIE];
  if (sessionId) sessions.delete(sessionId);
}

export function customerAccountCookie(sessionId) {
  const attrs = [
    `${CUSTOMER_ACCOUNT_SESSION_COOKIE}=${sessionId}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=3600',
  ];
  return attrs.join('; ');
}

export function clearCustomerAccountCookie() {
  return `${CUSTOMER_ACCOUNT_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

async function discoverCustomerAccountAuthConfig(shop) {
  const endpoint = `https://${shop}/.well-known/openid-configuration`;
  console.info('[customer-account] auth discovery request', JSON.stringify({ shop, endpoint }));
  const response = await fetch(endpoint, {
    headers: {
      Accept: CONTENT_TYPE_JSON,
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`OpenID discovery failed: ${response.status}`);
  }
  return response.json();
}

async function discoverCustomerAccountApiConfig(shop) {
  const endpoint = `https://${shop}/.well-known/customer-account-api`;
  console.info('[customer-account] api discovery request', JSON.stringify({ shop, endpoint }));
  const response = await fetch(endpoint, {
    headers: {
      Accept: CONTENT_TYPE_JSON,
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Customer Account API discovery failed: ${response.status}`);
  }
  return response.json();
}

async function getCustomerAccountProfile(shop, accessToken, origin) {
  const apiConfig = await discoverCustomerAccountApiConfig(shop);
  console.info('[customer-account] profile request', JSON.stringify({
    shop,
    endpoint: apiConfig.graphql_api,
    origin,
    hasAccessToken: Boolean(accessToken),
  }));
  const response = await fetch(apiConfig.graphql_api, {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPE_JSON,
      Authorization: accessToken,
      'User-Agent': USER_AGENT,
      Origin: origin,
    },
    body: JSON.stringify({
      query: `query CustomerAccountProfile {
        customer {
          id
          firstName
          lastName
          displayName
          emailAddress {
            emailAddress
          }
          defaultAddress {
            id
            firstName
            lastName
            company
            address1
            address2
            city
            territoryCode
            zoneCode
            zip
          }
          addresses(first: 5) {
            nodes {
              id
              firstName
              lastName
              company
              address1
              address2
              city
              territoryCode
              zoneCode
              zip
            }
          }
        }
      }`,
    }),
  });
  const text = await response.text();
  logCustomerAccountResponse('profile response', response, text);
  const json = parseCustomerAccountJson(text, 'profile response');
  if (!response.ok || json.errors != null) {
    console.info('[customer-account] profile rejected', JSON.stringify({
      status: response.status,
      errors: json.errors || null,
      body: !response.ok ? truncateForLog(text) : '',
    }));
    throw new Error(`Customer Account API profile query failed: ${JSON.stringify(json.errors || json)}`);
  }
  return json.data.customer;
}

function logCustomerAccountResponse(label, response, text) {
  const details = {
    status: response.status,
    ok: response.ok,
    wwwAuthenticate: response.headers.get('www-authenticate') || '',
  };
  if (!response.ok) details.body = truncateForLog(text);
  console.info(`[customer-account] ${label}`, JSON.stringify(details));
}

function parseCustomerAccountJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.info('[customer-account] json parse failed', JSON.stringify({
      label,
      body: truncateForLog(text),
      message: error.message,
    }));
    throw error;
  }
}

function truncateForLog(text) {
  if (!text) return '';
  return text.length > 2000 ? `${text.slice(0, 2000)}...` : text;
}

function getTokenPrefix(token) {
  if (!token || typeof token !== 'string') return '';
  const index = token.indexOf('_');
  return index === -1 ? token.slice(0, 8) : token.slice(0, index + 1);
}

function createPkceVerifier() {
  return randomBytes(64).toString('base64url');
}

function createPkceChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf('=');
        if (index === -1) return [cookie, ''];
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))];
      }),
  );
}
