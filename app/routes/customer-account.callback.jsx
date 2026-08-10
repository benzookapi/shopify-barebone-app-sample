import {
  completeCustomerAccountLogin,
  customerAccountCookie,
} from '../lib/customer-account.server.js';
import { redirect } from '../lib/http.server.js';

export async function loader({ request }) {
  try {
    const { returnTo, sessionId } = await completeCustomerAccountLogin(request);
    const response = redirect(returnTo);
    response.headers.append('Set-Cookie', customerAccountCookie(sessionId));
    return response;
  } catch (error) {
    if (error instanceof Response) {
      const body = await error.text();
      console.info('[customer-account] callback failed', JSON.stringify({
        status: error.status,
        body,
      }));
      return new Response(body, {
        status: error.status,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    console.info('[customer-account] callback failed', JSON.stringify({
      status: 500,
      message: error.message,
      stack: error.stack,
    }));
    return new Response(`Customer Account API callback failed: ${error.message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
