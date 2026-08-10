import { apiJson } from './embedded.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

export async function createWebPixel(request, context) {
  const url = new URL(request.url);
  const response = await callAdminGraphql(context.shop, `mutation WebPixelCreate($webPixel: WebPixelInput!) {
    webPixelCreate(webPixel: $webPixel) {
      userErrors {
        field
        message
      }
      webPixel {
        settings
        id
      }
    }
  }`, {
    webPixel: {
      settings: JSON.stringify({
        ga4Id: url.searchParams.get('ga4Id'),
        ga4Sec: url.searchParams.get('ga4Sec'),
        ga4Debug: url.searchParams.get('ga4Debug'),
      }),
    },
  });
  return apiJson(response);
}
