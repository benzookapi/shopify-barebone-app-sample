import { json } from './http.server.js';
import { requireAuthenticatedShop } from './session-token.server.js';
import { decodeAppJwt, getAdminFromShop, verifyAppProxySignature, verifyWebhookHmac } from './shopify-auth.server.js';


export async function appProxy(request, body) {
  const url = new URL(request.url);
  if (!verifyAppProxySignature(url.searchParams)) {
    return new Response('App proxy signature verification failed', { status: 400 });
  }

  const response = {
    message: 'CAUTION! DO NOT RETURN PRIVATE DATA OVER APP PROXY, THIS IS FULLY PUBLIC.',
    query: Object.fromEntries(url.searchParams),
    body,
  };

  if (url.searchParams.get('format') === 'liquid') {
    return new Response(`<h2>Liquid objects rendered by the app proxy in 'Content-Type application/liquid'</h2>
      <ul>
        <li>&#123;&#123;shop.name&#125;&#125;: {{shop.name}}</li>
        <li>&#123;&#123;template.name&#125;&#125;: {{template.name}}</li>
        <li>&#123;&#123;customer.email&#125;&#125;: {{customer.email}}</li>
        <li>&#123;&#123;product.title&#125;&#125;: {{product.title}}</li>
      </ul>
      <h2>Request query from the app proxy to my app endpoint</h2>
      <pre>${JSON.stringify(response, null, 4)}</pre>`, {
      headers: { 'Content-Type': 'application/liquid' },
    });
  }

  return json(response);
}

export async function mockLogin(request) {
  const url = new URL(request.url);
  let target = '';
  let details = '';

  const sessionToken = url.searchParams.get('sessiontoken');
  if (sessionToken) {
    const context = await requireAuthenticatedShop(new Request(request.url, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    }));
    if (!context.ok) return new Response('Signature unmatched. Incorrect session token sent', { status: 400 });
    target = `<p>You are connecting to: <h3>${context.shop}</h3></p>`;
    details = `<p><b>The following is the received session token with the shop data above which you can never falsify.</b></p>
      <pre>${sessionToken}</pre>
      <p><a href="https://${getAdminFromShop(context.shop)}">Go back to Shopify admin</a></p>`;
  }

  const appToken = url.searchParams.get('my_token');
  if (appToken) {
    const payload = decodeAppJwt(appToken);
    const shop = payload.shop;
    target = `<p>You are connecting to: <h3>${shop}</h3></p>`;
    details = `<p><b>The following is your own JWT token with the shop.</b></p>
      <pre>${appToken}</pre>
      <p><a href="https://${getAdminFromShop(shop)}">Go back to Shopify admin</a></p>`;
  }

  return new Response(`<h1>Welcome to my mock login for my dummy service</h1>
    ${target}
    <p>Your email: <input /></p>
    <p>Your password: <input /></p>
    <p><button onClick="javascript:window.location.href='./mocklogin';">Login</button></p>
    ${details}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function webhookAction(request) {
  const valid = await verifyWebhookHmac(request);
  return new Response(null, { status: valid ? 200 : 401 });
}

export function trackingNumbers(request) {
  const url = new URL(request.url);
  const orderNames = url.searchParams.getAll('order_names[]');
  const body = {
    tracking_numbers: {},
    message: 'Successfully received the tracking numbers',
    success: true,
  };
  orderNames.forEach((name) => {
    body.tracking_numbers[name] = `service-fetch-${Date.now()}`;
  });
  return json(body);
}

export function stockLevels(request) {
  const url = new URL(request.url);
  const sku = url.searchParams.get('sku');
  const body = {};
  if (sku) {
    body[sku] = Math.floor(Math.random() * 2000);
  } else {
    body.DUMMYSKU2000 = Math.floor(Math.random() * 3000);
    body.DUMMYSKU3000 = Math.floor(Math.random() * 4000);
  }
  return json(body);
}
