import {
  embeddedHtmlData,
  redirect,
  routeHeaders,
  verifyEmbeddedRequest,
} from '../lib/http.server.js';
import Storefront from '../pages/Storefront.jsx';

export async function loader({ request }) {
  const url = new URL(request.url);
  if (url.searchParams.has('shop') && !url.searchParams.has('embedded')) {
    return redirect(`/storefront/plain${url.search}`);
  }

  const verified = verifyEmbeddedRequest(request);
  if (!verified.ok) throw verified.response;
  return embeddedHtmlData(verified.shop);
}

export const headers = routeHeaders;

export default Storefront;
