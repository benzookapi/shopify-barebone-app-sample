import { json, parseRequestBody } from '../lib/http.server.js';
import {
  callPrivateStorefrontAction,
  renderStorefrontPage,
} from '../lib/storefront.server.js';

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  if (!shop) {
    return new Response('Missing shop', { status: 400 });
  }

  return renderStorefrontPage(request, {
    shop,
    publicToken: url.searchParams.get('public_token') || '',
  });
}

export async function action({ request }) {
  const url = new URL(request.url);
  const actionName = url.searchParams.get('action');
  const body = await parseRequestBody(request);

  const result = await callPrivateStorefrontAction({
    shop: body.shop,
    action: actionName,
    locale: url.searchParams.get('locale'),
    variables: body.variables,
    buyerIp: body.ip_address,
  });

  return json(result);
}
