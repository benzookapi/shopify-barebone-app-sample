import { redirect } from '../lib/http.server.js';
import { startCustomerAccountLogin } from '../lib/customer-account.server.js';

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  if (!shop) {
    return new Response('Missing shop', { status: 400 });
  }

  const authorizationUrl = await startCustomerAccountLogin({
    request,
    shop,
    publicToken: url.searchParams.get('public_token') || '',
    clientId: (url.searchParams.get('customer_account_client_id') || '').trim(),
  });
  return redirect(authorizationUrl);
}
