import { appProxy } from '../lib/public-endpoints.server.js';
import { parseRequestBody } from '../lib/http.server.js';

export async function loader({ request }) {
  return appProxy(request, {});
}

export async function action({ request }) {
  return appProxy(request, await parseRequestBody(request));
}
