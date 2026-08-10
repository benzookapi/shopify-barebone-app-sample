import { embeddedPageLoader } from '../lib/embedded.server.js';
import { loadAdminLink } from '../lib/admin-link.server.js';

export async function loader({ request }) {
  return embeddedPageLoader({
    request,
    allowAuthenticatedFetch: true,
    handler: loadAdminLink,
  });
}
