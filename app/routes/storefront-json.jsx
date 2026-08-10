import { embeddedPageLoader } from '../lib/embedded.server.js';
import { json } from '../lib/http.server.js';
import { getPublicOrigin } from '../lib/public-url.server.js';
import { prepareStorefrontAccess } from '../lib/storefront.server.js';

export async function loader({ request }) {
  return embeddedPageLoader({
    request,
    allowAuthenticatedFetch: true,
    handler: async (_request, context) => {
      try {
        const response = await prepareStorefrontAccess(context.shop, getPublicOrigin(request));
        return json({
          result: {
            message: '',
            response,
          },
        });
      } catch (error) {
        return json({
          result: {
            message: error.message,
            response: {
              error_count: 1,
              error_messages: [error.message],
            },
          },
        }, { status: 500 });
      }
    },
  });
}
