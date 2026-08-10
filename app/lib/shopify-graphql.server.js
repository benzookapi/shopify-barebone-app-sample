import {
  CONTENT_TYPE_JSON,
  GRAPHQL_PATH_ADMIN,
  GRAPHQL_PATH_STOREFRONT,
  USER_AGENT,
} from './env.server.js';
import { getShopData } from './shop-store.server.js';
import { normalizeShopDomain } from './shopify-auth.server.js';

export async function callAdminGraphql(shop, query, variables = null, token = null) {
  const shopDomain = normalizeShopDomain(shop);
  if (!shopDomain) throw new Error(`Invalid Shopify shop domain: ${shop || '(empty)'}`);
  const accessToken = token || (await getShopData(shopDomain))?.access_token;
  if (!accessToken) throw new Error(`No Admin API token stored for ${shopDomain}`);
  return callShopifyGraphql(`https://${shopDomain}/${GRAPHQL_PATH_ADMIN}`, query, variables, {
    'X-Shopify-Access-Token': accessToken,
  }, { apiName: 'Shopify Admin GraphQL', shop: shopDomain });
}

export async function callStorefrontGraphql(shop, query, variables, token, buyerIp = null) {
  const headers = {};
  if (token) {
    headers['Shopify-Storefront-Private-Token'] = token;
  }
  if (buyerIp) {
    headers['Shopify-Storefront-Buyer-IP'] = buyerIp;
  }
  return callShopifyGraphql(`https://${shop}/${GRAPHQL_PATH_STOREFRONT}`, query, variables, headers);
}

async function callShopifyGraphql(endpoint, query, variables, headers, context = {}) {
  console.info('[shopify-graphql] request', JSON.stringify({
    apiName: context.apiName || 'Shopify GraphQL',
    endpoint,
    operation: getGraphqlOperationName(query),
    query: compactGraphql(query),
    variables: redactGraphqlVariables(variables),
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPE_JSON,
      'User-Agent': USER_AGENT,
      ...headers,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
  const responseText = await response.text();
  const json = parseGraphqlResponse(responseText);
  console.info('[shopify-graphql] response', JSON.stringify({
    apiName: context.apiName || 'Shopify GraphQL',
    endpoint,
    operation: getGraphqlOperationName(query),
    status: response.status,
    ok: response.ok,
    body: json == null ? previewText(responseText) : redactGraphqlVariables(json),
  }));

  if (!response.ok) {
    const prefix = context.apiName || 'Shopify GraphQL';
    const shopHint = context.shop ? ` for ${context.shop}` : '';
    const staleTokenHint = response.status === 401
      ? ' The access token was rejected by Shopify; refresh OAuth for this shop and app.'
      : '';
    const error = new Error(`${prefix} failed ${response.status}${shopHint}:${staleTokenHint} ${json == null ? responseText : JSON.stringify(json)}`);
    error.status = response.status;
    error.body = json || responseText;
    throw error;
  }
  return json;
}

function parseGraphqlResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function previewText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}

function compactGraphql(query) {
  return String(query || '').replace(/\s+/g, ' ').trim();
}

function getGraphqlOperationName(query) {
  return compactGraphql(query).match(/\b(query|mutation)\s+([A-Za-z0-9_]+)/)?.[2] || '';
}

function redactGraphqlVariables(value, key = '') {
  if (value == null) return value;
  if (/token|secret|password|authorization/i.test(key)) return '[redacted]';
  if (Array.isArray(value)) return value.map((item) => redactGraphqlVariables(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactGraphqlVariables(entryValue, entryKey),
      ]),
    );
  }
  if (typeof value === 'string' && value.length > 300) {
    return `${value.slice(0, 300)}...`;
  }
  return value;
}
