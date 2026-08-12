import { embeddedPageLoader } from '../lib/embedded.server.js';
import { routeHeaders } from '../lib/http.server.js';
import CustomerAccountUi from '../pages/CustomerAccountUi.jsx';

export async function loader({ request }) {
  return embeddedPageLoader({ request });
}

export const headers = routeHeaders;

export default CustomerAccountUi;
