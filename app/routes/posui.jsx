import { embeddedPageLoader } from '../lib/embedded.server.js';
import { routeHeaders } from '../lib/http.server.js';
import PosUi from '../pages/PosUi.jsx';

export async function loader({ request }) {
  return embeddedPageLoader({ request });
}

export const headers = routeHeaders;

export default PosUi;
