import { json } from './http.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

export async function loadAdminLink(request, context) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  let response = {};
  if (id) {
    try {
      response = await callAdminGraphql(context.shop, `query AdminLinkedProduct($id: ID!) {
        product(id: $id) {
          id
          handle
          title
          onlineStoreUrl
          priceRangeV2 {
            maxVariantPrice {
              amount
              currencyCode
            }
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
              }
            }
          }
        }
      }`, { id: `gid://shopify/Product/${id}` });
    } catch (error) {
      response = {
        error: {
          message: error.message,
          status: error.status || null,
          hint: 'The stored Admin API access token could not call Shopify. Reinstall the app or restart OAuth for this shop so the sample stores a fresh token for the current app.',
        },
      };
    }
  }

  return json({
    result: {
      message: '',
      response,
    },
  });
}
