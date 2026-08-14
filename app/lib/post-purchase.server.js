import { v4 as uuidv4 } from 'uuid';
import { json } from './http.server.js';
import { requireAuthenticatedShop } from './session-token.server.js';
import { createAppJwt, decodeSessionToken } from './shopify-auth.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

export const postPurchaseCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function postPurchaseJson(data, init = {}) {
  return json(data, {
    ...init,
    headers: {
      ...postPurchaseCorsHeaders,
      ...(init.headers || {}),
    },
  });
}

export async function handlePostPurchaseAction(request) {
  const context = await requireAuthenticatedShop(request);
  if (!context.ok) {
    const message = context.response?.result?.message || 'Authorization failed';
    console.info('[postpurchase] authentication failed', JSON.stringify({ status: context.status, message }));
    return postPurchaseJson({ Error: message }, { status: context.status || 400 });
  }

  const url = new URL(request.url);
  const payload = decodeSessionToken(context.token);
  const inputData = payload.input_data || null;
  const shop = inputData != null ? inputData.shop.domain : payload.dest?.replace('https://', '');
  const customerId = inputData != null ? `${inputData.initialPurchase.customerId}` : payload.sub || '';

  let responseData = {};
  const upsellProductIds = url.searchParams.get('upsell_product_ids');
  if (upsellProductIds) {
    const requestedProductIds = JSON.parse(upsellProductIds)
      .filter((id) => id != null && String(id).trim() !== '')
      .map((id) => String(id).trim());
    const query = requestedProductIds.map((id) => `id:${id}`).join(' OR ');
    console.info('[postpurchase] upsell request', JSON.stringify({
      shop,
      requestedProductIds,
      query,
    }));
    if (!query) return postPurchaseJson(responseData);
    const response = await callAdminGraphql(shop, `query UpsellProducts($query: String!) {
      products(first: 10, query: $query) {
        edges {
          node {
            id
            title
            featuredImage {
              url
            }
            priceRangeV2 {
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                }
              }
            }
          }
        }
      }
    }`, { query });
    responseData = response.data;
    console.info('[postpurchase] upsell response', JSON.stringify({
      shop,
      requestedProductIds,
      productCount: responseData?.products?.edges?.length || 0,
      response: responseData,
    }));
  }

  const changes = url.searchParams.get('changes');
  if (changes) {
    responseData = {
      token: createAppJwt({
        iss: process.env.SHOPIFY_API_KEY || '',
        jti: uuidv4(),
        iat: Date.now(),
        sub: inputData != null ? inputData.initialPurchase.referenceId : '',
        changes: JSON.parse(changes),
      }),
    };
  }

  const score = url.searchParams.get('score');
  if (score && customerId !== '') {
    const ownerId = customerId.includes('gid') ? customerId : `gid://shopify/Customer/${customerId}`;
    const response = await callAdminGraphql(shop, `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          value
        }
        userErrors {
          field
          message
        }
      }
    }`, {
      metafields: [
        {
          key: 'score',
          namespace: 'barebone_app_review',
          ownerId,
          type: 'number_integer',
          value: `${parseInt(score, 10)}`,
        },
      ],
    });
    responseData = response.data;
  }

  return postPurchaseJson(responseData);
}
