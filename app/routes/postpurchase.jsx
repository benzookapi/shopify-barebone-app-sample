import {
  handlePostPurchaseAction,
} from '../lib/post-purchase.server.js';
import { embeddedPageLoader } from '../lib/embedded.server.js';
import { routeHeaders } from '../lib/http.server.js';
import PostPurchase from '../pages/PostPurchase.jsx';

export async function loader({ request }) {
  return embeddedPageLoader({ request });
}

export async function action({ request }) {
  return handlePostPurchaseAction(request);
}

export const headers = routeHeaders;

export default PostPurchase;
