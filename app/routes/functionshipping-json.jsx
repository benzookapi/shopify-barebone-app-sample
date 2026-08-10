import { embeddedPageLoader } from '../lib/embedded.server.js';
import { createDeliveryCustomization } from '../lib/functions-samples.server.js';

export async function loader({ request }) {
  return embeddedPageLoader({
    request,
    allowAuthenticatedFetch: true,
    handler: createDeliveryCustomization,
  });
}
