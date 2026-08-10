import { embeddedPageLoader } from '../lib/embedded.server.js';
import { createWebPixel } from '../lib/web-pixel.server.js';

export async function loader({ request }) {
  return embeddedPageLoader({
    request,
    allowAuthenticatedFetch: true,
    handler: createWebPixel,
  });
}
