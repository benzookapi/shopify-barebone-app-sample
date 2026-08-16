import { json } from './http.server.js';
import { requireAuthenticatedShop } from './session-token.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';
import {
  decodeAppJwt,
  getAdminFromShop,
  getBearerToken,
  normalizeShopDomain,
  verifyAppProxySignature,
  verifyWebhookHmac,
} from './shopify-auth.server.js';

const FULFILLMENT_CREATION_DELAY_MS = 5000;
const DELIVERY_EVENT_DELAY_MS = 5000;
const fulfillmentJobs = new Map();

export const mockLoginCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};


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

  const querySessionToken = url.searchParams.get('sessiontoken');
  const sessionToken = querySessionToken || getBearerToken(request);
  if (sessionToken) {
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${sessionToken}`);
    const context = await requireAuthenticatedShop(new Request(request.url, { headers }));
    if (!context.ok) {
      return new Response('Signature unmatched. Incorrect session token sent', {
        status: 400,
        headers: mockLoginCorsHeaders,
      });
    }
    target = `<p>You are connecting to:</p><h3>${context.shop}</h3>`;
    details = querySessionToken
      ? `<p><b>The following is the received session token with the shop data above which you can never falsify.</b></p>
        <pre>${sessionToken}</pre>
        <p><a href="https://${getAdminFromShop(context.shop)}">Go back to Shopify admin</a></p>`
      : '<p><b>This request was authenticated with the Shopify session token in its Authorization header.</b></p>';
  }

  const appToken = url.searchParams.get('my_token');
  if (appToken) {
    const payload = decodeAppJwt(appToken);
    const shop = payload.shop;
    target = `<p>You are connecting to:</p><h3>${shop}</h3>`;
    details = `<p><b>The following is your own JWT token with the shop.</b></p>
      <pre>${appToken}</pre>
      <p><a href="https://${getAdminFromShop(shop)}">Go back to Shopify admin</a></p>`;
  }

  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mock service login</title>
  </head>
  <body>
    <h1>Welcome to my mock login for my dummy service</h1>
    ${target}
    <p>Your email: <input type="email" /></p>
    <p>Your password: <input type="password" /></p>
    <p><button onclick="window.location.href='./mocklogin'">Login</button></p>
    ${details}
  </body>
</html>`, {
    headers: {
      ...mockLoginCorsHeaders,
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline; filename="mocklogin.html"',
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function webhookAction(request) {
  const delivery = await readWebhookDelivery(request);
  logWebhookDelivery(delivery);
  return new Response(null, { status: delivery.valid ? 200 : 401 });
}

export async function fulfillmentOrderNotification(request) {
  const delivery = await readWebhookDelivery(request);
  logFulfillmentServiceNotification(delivery);

  if (!delivery.valid) return new Response(null, { status: 401 });

  const shop = normalizeShopDomain(delivery.shop);
  if (!shop) {
    console.error('[fulfillment-service] notification is missing a valid shop domain');
    return new Response(null, { status: 400 });
  }

  if (delivery.payload?.kind === 'FULFILLMENT_REQUEST') {
    enqueueFulfillmentJob(shop);
  } else {
    console.info('[fulfillment-service] notification acknowledged without automatic processing', JSON.stringify({
      shop,
      kind: delivery.payload?.kind || '',
    }));
  }

  // Shopify only needs an acknowledgement here. Admin API work continues after this response.
  return new Response(null, { status: 200 });
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

async function readWebhookDelivery(request) {
  const rawBody = await request.text();
  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = rawBody;
  }

  return {
    apiVersion: request.headers.get('x-shopify-api-version') || '',
    eventId: request.headers.get('x-shopify-event-id') || '',
    path: new URL(request.url).pathname,
    payload,
    shop: request.headers.get('x-shopify-shop-domain') || '',
    topic: request.headers.get('x-shopify-topic') || '',
    triggeredAt: request.headers.get('x-shopify-triggered-at') || '',
    valid: await verifyWebhookHmac(request, rawBody),
    webhookId: request.headers.get('x-shopify-webhook-id') || '',
  };
}

function logWebhookDelivery(delivery) {
  console.info('[webhook] received', JSON.stringify({
    path: delivery.path,
    topic: delivery.topic,
    shop: delivery.shop,
    webhookId: delivery.webhookId,
    eventId: delivery.eventId,
    apiVersion: delivery.apiVersion,
    triggeredAt: delivery.triggeredAt,
    hmacValid: delivery.valid,
    payload: delivery.payload,
  }, null, 2));
}

function logFulfillmentServiceNotification(delivery) {
  console.info('[fulfillment-service] notification received', JSON.stringify({
    path: delivery.path,
    shop: delivery.shop,
    hmacValid: delivery.valid,
    payload: delivery.payload,
  }, null, 2));
}

function enqueueFulfillmentJob(shop) {
  const previousJob = fulfillmentJobs.get(shop) || Promise.resolve();
  const job = previousJob
    .then(() => processRequestedFulfillments(shop))
    .catch((error) => {
      console.error('[fulfillment-service] background job failed', JSON.stringify({
        shop,
        error: error instanceof Error ? error.message : String(error),
      }));
    });

  fulfillmentJobs.set(shop, job);
  void job.then(() => {
    if (fulfillmentJobs.get(shop) === job) fulfillmentJobs.delete(shop);
  });
}

async function processRequestedFulfillments(shop) {
  const response = await callAdminGraphql(shop, `query AssignedFulfillmentRequests {
    assignedFulfillmentOrders(first: 10, assignmentStatus: FULFILLMENT_REQUESTED) {
      edges {
        node {
          id
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`);
  const queryErrors = getGraphqlErrors(response);
  if (queryErrors.length > 0) throw new Error(queryErrors.join(', '));

  const connection = response.data?.assignedFulfillmentOrders;
  const fulfillmentOrderIds = connection?.edges?.map((edge) => edge.node.id) || [];
  if (connection?.pageInfo?.hasNextPage) {
    console.warn('[fulfillment-service] only the first 10 requested fulfillment orders will be processed', JSON.stringify({ shop }));
  }
  if (fulfillmentOrderIds.length === 0) {
    console.info('[fulfillment-service] no requested fulfillment orders found', JSON.stringify({ shop }));
    return;
  }

  const acceptedIds = [];
  for (const id of fulfillmentOrderIds) {
    const acceptResponse = await callAdminGraphql(shop, `mutation AcceptFulfillmentRequest($id: ID!, $message: String) {
      fulfillmentOrderAcceptFulfillmentRequest(id: $id, message: $message) {
        fulfillmentOrder {
          id
          status
          requestStatus
        }
        userErrors {
          field
          message
        }
      }
    }`, {
      id,
      message: 'Your request has been accepted!',
    });
    const acceptErrors = getGraphqlErrors(acceptResponse, 'fulfillmentOrderAcceptFulfillmentRequest');
    if (acceptErrors.length > 0) {
      console.error('[fulfillment-service] fulfillment request could not be accepted', JSON.stringify({
        shop,
        fulfillmentOrderId: id,
        errors: acceptErrors,
      }));
      continue;
    }
    acceptedIds.push(id);
  }

  if (acceptedIds.length === 0) return;

  console.info('[fulfillment-service] waiting before creating fulfillments', JSON.stringify({
    shop,
    fulfillmentOrderIds: acceptedIds,
    delayMs: FULFILLMENT_CREATION_DELAY_MS,
  }));
  await delay(FULFILLMENT_CREATION_DELAY_MS);

  const createdFulfillments = [];
  for (const fulfillmentOrderId of acceptedIds) {
    const fulfillmentResponse = await callAdminGraphql(shop, `mutation CreateServiceFulfillment($fulfillment: FulfillmentInput!, $message: String) {
      fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
        fulfillment {
          id
          name
          status
        }
        userErrors {
          field
          message
        }
      }
    }`, {
      fulfillment: {
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId,
          },
        ],
        trackingInfo: {
          company: 'Barebone app shipping carrier',
          number: `service-${Date.now()}`,
          url: 'https://www.shopify.com',
        },
      },
      message: 'Your fulfillment has been created by the fulfillment service app!',
    });
    const fulfillmentErrors = getGraphqlErrors(fulfillmentResponse, 'fulfillmentCreate');
    if (fulfillmentErrors.length > 0) {
      console.error('[fulfillment-service] fulfillment could not be created', JSON.stringify({
        shop,
        fulfillmentOrderId,
        errors: fulfillmentErrors,
      }));
      continue;
    }
    const fulfillment = fulfillmentResponse.data?.fulfillmentCreate?.fulfillment;
    if (!fulfillment?.id) {
      console.error('[fulfillment-service] fulfillment response did not include an ID', JSON.stringify({
        shop,
        fulfillmentOrderId,
      }));
      continue;
    }
    createdFulfillments.push(fulfillment);
    console.info('[fulfillment-service] fulfillment created', JSON.stringify({
      shop,
      fulfillmentOrderId,
      fulfillment,
    }));
  }

  if (createdFulfillments.length === 0) return;

  console.info('[fulfillment-service] waiting before marking fulfillments as delivered', JSON.stringify({
    shop,
    fulfillmentIds: createdFulfillments.map((fulfillment) => fulfillment.id),
    delayMs: DELIVERY_EVENT_DELAY_MS,
  }));
  await delay(DELIVERY_EVENT_DELAY_MS);

  for (const fulfillment of createdFulfillments) {
    const eventResponse = await callAdminGraphql(shop, `mutation CreateDeliveredEvent($fulfillmentEvent: FulfillmentEventInput!) {
      fulfillmentEventCreate(fulfillmentEvent: $fulfillmentEvent) {
        fulfillmentEvent {
          status
          happenedAt
          message
        }
        userErrors {
          field
          message
        }
      }
    }`, {
      fulfillmentEvent: {
        fulfillmentId: fulfillment.id,
        happenedAt: new Date().toISOString(),
        message: 'Your order has been delivered by the fulfillment service app!',
        status: 'DELIVERED',
      },
    });
    const eventErrors = getGraphqlErrors(eventResponse, 'fulfillmentEventCreate');
    if (eventErrors.length > 0) {
      console.error('[fulfillment-service] delivered event could not be created', JSON.stringify({
        shop,
        fulfillmentId: fulfillment.id,
        errors: eventErrors,
      }));
      continue;
    }
    console.info('[fulfillment-service] fulfillment marked as delivered', JSON.stringify({
      shop,
      fulfillmentId: fulfillment.id,
      event: eventResponse.data.fulfillmentEventCreate.fulfillmentEvent,
    }));
  }
}

function getGraphqlErrors(response, mutationName = '') {
  const errors = (response.errors || []).map((error) => error.message);
  if (mutationName) {
    errors.push(...(response.data?.[mutationName]?.userErrors || []).map((error) => error.message));
  }
  return errors;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
