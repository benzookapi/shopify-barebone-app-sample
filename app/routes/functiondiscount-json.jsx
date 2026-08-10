import { embeddedPageLoader } from '../lib/embedded.server.js';
import { createFunctionDiscount } from '../lib/functions-samples.server.js';

export async function loader({ request }) {
  return embeddedPageLoader({
    request,
    allowAuthenticatedFetch: true,
    handler: createFunctionDiscount,
  });
}
