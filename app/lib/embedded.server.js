import {
  embeddedHtmlData,
  json,
  redirect,
  verifyEmbeddedRequest,
} from './http.server.js';
import { createOAuthAuthorizeUrl, hasValidInstallation } from './oauth.server.js';
import { getPublicOrigin } from './public-url.server.js';
import { requireAuthenticatedShop } from './session-token.server.js';

export async function embeddedPageLoader({ request, allowAuthenticatedFetch = false, handler = null }) {
  if (allowAuthenticatedFetch && request.headers.has('authorization')) {
    const context = await requireAuthenticatedShop(request);
    if (!context.ok) return json(context.response, { status: context.status });
    if (handler) return handler(request, context);
    return json({
      result: {
        message: 'Successfully authorized!',
        response: {},
      },
    });
  }

  const verified = verifyEmbeddedRequest(request);
  if (!verified.ok) throw verified.response;

  const { shop } = verified;
  if (!(await hasValidInstallation(shop))) {
    const publicOrigin = getPublicOrigin(request);
    return redirect(createOAuthAuthorizeUrl(shop, publicOrigin));
  }
  return embeddedHtmlData(shop);
}

export async function authenticatedEndpoint(request, handler) {
  const context = await requireAuthenticatedShop(request);
  if (!context.ok) return json(context.response, { status: context.status });
  return handler(context);
}

export function apiJson(response) {
  return json({
    result: {
      message: '',
      response,
    },
  });
}
