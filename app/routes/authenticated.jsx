import { json } from '../lib/http.server.js';
import { requireAuthenticatedShop } from '../lib/session-token.server.js';
import { verifySessionToken } from '../lib/shopify-auth.server.js';

export async function loader({ request }) {
  const context = await requireAuthenticatedShop(request);
  const token = context.token || '';
  const [header, payload] = token.split('.');
  const signatureGenerated = verifySessionToken(token) ? token.split('.')[2] : '';

  if (!context.ok) {
    return json({
      request_url: new URL(request.url).pathname,
      authentication_bearer: token,
      result: {
        signature_verified: false,
        signature_generated: signatureGenerated,
        shop_from_payload: '',
        access_token: '',
        message: context.response.result.message,
      },
    }, { status: context.status });
  }

  return json({
    request_url: new URL(request.url).pathname,
    authentication_bearer: token,
    result: {
      signature_verified: Boolean(header && payload),
      signature_generated: signatureGenerated,
      shop_from_payload: context.shop,
      access_token: context.shopData.access_token,
      message: 'Successfully authorized!',
    },
  });
}
