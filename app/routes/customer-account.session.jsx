import { getCustomerAccountSession } from '../lib/customer-account.server.js';
import { json } from '../lib/http.server.js';

export async function loader({ request }) {
  const session = getCustomerAccountSession(request);
  return json({
    profile: session != null ? session.profile : null,
  });
}
