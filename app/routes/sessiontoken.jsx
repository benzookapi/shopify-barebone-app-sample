import { embeddedHtmlData, routeHeaders, verifyEmbeddedRequest } from '../lib/http.server.js';
import SessionToken from '../pages/SessionToken.jsx';

export async function loader({ request }) {
  const verified = verifyEmbeddedRequest(request);
  if (!verified.ok) throw verified.response;
  return embeddedHtmlData(verified.shop);
}

export const headers = routeHeaders;

export default SessionToken;
