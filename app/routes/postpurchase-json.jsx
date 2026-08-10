import { embeddedPageLoader } from '../lib/embedded.server.js';
import { preparePostPurchase } from '../lib/post-purchase.server.js';

export async function loader({ request }) {
  return embeddedPageLoader({
    request,
    allowAuthenticatedFetch: true,
    handler: preparePostPurchase,
  });
}
