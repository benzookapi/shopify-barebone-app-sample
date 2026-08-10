import {
  clearCustomerAccountCookie,
  deleteCustomerAccountSession,
} from '../lib/customer-account.server.js';
import { json } from '../lib/http.server.js';

export async function action({ request }) {
  deleteCustomerAccountSession(request);
  return json(
    { result: 'ok' },
    {
      headers: {
        'Set-Cookie': clearCustomerAccountCookie(),
      },
    },
  );
}
