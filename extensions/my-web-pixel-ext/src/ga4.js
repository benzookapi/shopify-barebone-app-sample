const GA4_ORIGIN = "https://www.google-analytics.com";

/**
 * @typedef {import("@shopify/web-pixels-extension").Checkout} Checkout
 * @typedef {import("@shopify/web-pixels-extension").CheckoutLineItem} CheckoutLineItem
 * @typedef {import("@shopify/web-pixels-extension").Context} Context
 * @typedef {import("@shopify/web-pixels-extension").Events["all_events"]} PixelEvent
 */

/**
 * @param {Record<string, unknown>} settings
 */
export function createGa4Request(settings) {
  const measurementId = String(settings.ga4Id ?? "").trim();
  const apiSecret = String(settings.ga4Sec ?? "").trim();

  if (!measurementId || !apiSecret) return null;

  const debug = settings.ga4Debug === true || settings.ga4Debug === "true";
  const path = debug ? "/debug/mp/collect" : "/mp/collect";
  const query = [
    `measurement_id=${encodeURIComponent(measurementId)}`,
    `api_secret=${encodeURIComponent(apiSecret)}`,
  ].join("&");

  return {
    debug,
    url: `${GA4_ORIGIN}${path}?${query}`,
  };
}

/**
 * @param {PixelEvent} event
 */
export function buildGa4Payload(event) {
  let ga4Event = null;

  switch (event.name) {
    case "product_added_to_cart":
      ga4Event = buildAddToCartEvent(event);
      break;
    case "checkout_started":
      ga4Event = buildCheckoutEvent("begin_checkout", event.data.checkout, event.context);
      break;
    case "payment_info_submitted":
      ga4Event = buildCheckoutEvent("add_payment_info", event.data.checkout, event.context);
      break;
    case "checkout_completed":
      ga4Event = buildPurchaseEvent(event.data.checkout, event.context);
      break;
    default:
      return null;
  }

  if (!ga4Event) return null;

  return {
    client_id: event.clientId,
    events: [ga4Event],
  };
}

/**
 * @param {{debug: boolean, url: string}} request
 * @param {{client_id: string, events: Array<Record<string, unknown>>}} payload
 * @param {typeof fetch} fetchImplementation
 */
export async function sendGa4Payload(
  request,
  payload,
  fetchImplementation = fetch,
) {
  const response = await fetchImplementation(request.url, {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`GA4 returned HTTP ${response.status}.`);
  }

  return response;
}

function buildAddToCartEvent(event) {
  const cartLine = event.data.cartLine;
  if (!cartLine) return null;

  const {merchandise} = cartLine;
  const {product} = merchandise;
  const {location} = event.context.document;

  return {
    name: "add_to_cart",
    params: {
      currency: cartLine.cost.totalAmount.currencyCode,
      value: cartLine.cost.totalAmount.amount,
      items: [
        {
          item_name: product.title,
          item_id: product.id ?? "",
          price: merchandise.price.amount,
          item_brand: product.vendor,
          item_variant: product.title,
          item_list_name: location.href,
          item_list_id: location.pathname,
          index: 1,
          quantity: cartLine.quantity,
        },
      ],
    },
  };
}

/**
 * @param {"begin_checkout" | "add_payment_info"} name
 * @param {Checkout} checkout
 * @param {Context} context
 */
function buildCheckoutEvent(name, checkout, context) {
  if (!checkout.totalPrice) return null;

  return {
    name,
    params: {
      currency: checkout.totalPrice.currencyCode,
      value: checkout.totalPrice.amount,
      items: buildCheckoutItems(checkout.lineItems, context),
    },
  };
}

/**
 * @param {Checkout} checkout
 * @param {Context} context
 */
function buildPurchaseEvent(checkout, context) {
  if (!checkout.totalPrice) return null;

  return {
    name: "purchase",
    params: {
      transaction_id: checkout.token,
      value: checkout.totalPrice.amount,
      tax: checkout.totalTax.amount,
      ...(checkout.shippingLine
        ? {shipping: checkout.shippingLine.price.amount}
        : {}),
      currency: checkout.totalPrice.currencyCode,
      items: buildCheckoutItems(checkout.lineItems, context),
    },
  };
}

/**
 * @param {CheckoutLineItem[]} lineItems
 * @param {Context} context
 */
function buildCheckoutItems(lineItems, context) {
  const {location} = context.document;

  return lineItems.flatMap((item, index) => {
    if (!item.variant) return [];

    return [
      {
        item_name: item.title ?? "",
        item_id: item.id ?? "",
        price: item.variant.price.amount,
        item_brand: item.variant.product.vendor,
        item_variant: item.variant.product.title,
        item_list_name: location.href,
        item_list_id: location.pathname,
        index,
        quantity: item.quantity,
      },
    ];
  });
}
