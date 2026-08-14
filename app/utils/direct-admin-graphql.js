const DEFAULT_API_VERSION = '2026-04';

export async function callDirectAdminGraphql(query, variables = null) {
  const apiVersion = document
    .querySelector('meta[name="shopify-api-version"]')
    ?.getAttribute('content') || DEFAULT_API_VERSION;
  const endpoint = `shopify:admin/api/${apiVersion}/graphql.json`;
  const operation = getGraphqlOperationName(query);

  console.info('[shopify-admin-direct] request', JSON.stringify({
    endpoint,
    operation,
    query: compactGraphql(query),
    variables: redactGraphqlData(variables),
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const responseText = await response.text();
  const body = parseJson(responseText);

  console.info('[shopify-admin-direct] response', JSON.stringify({
    endpoint,
    operation,
    status: response.status,
    ok: response.ok,
    body: redactGraphqlData(body ?? previewText(responseText)),
  }));

  if (!response.ok) {
    const errorBody = body == null ? previewText(responseText) : redactGraphqlData(body);
    throw new Error(`Shopify Admin GraphQL failed ${response.status}: ${typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)}`);
  }
  if (body == null) {
    throw new Error(`Shopify Admin GraphQL returned invalid JSON: ${previewText(responseText)}`);
  }

  return body;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
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

function redactGraphqlData(value, key = '') {
  if (value == null) return value;
  if (/token|secret|password|authorization|ga4sec|settings/i.test(key)) return '[redacted]';
  if (Array.isArray(value)) return value.map((item) => redactGraphqlData(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactGraphqlData(entryValue, entryKey),
      ]),
    );
  }
  if (typeof value === 'string' && value.length > 300) {
    return `${value.slice(0, 300)}...`;
  }
  return value;
}
