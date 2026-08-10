import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGa4Payload,
  createGa4Request,
  sendGa4Payload,
} from "./ga4.js";

const context = {
  document: {
    location: {
      href: "https://example.com/products/test-product",
      pathname: "/products/test-product",
    },
  },
};

const product = {
  id: "gid://shopify/Product/1",
  title: "Test product",
  vendor: "Test vendor",
};

const variant = {
  price: {amount: 12.5, currencyCode: "USD"},
  product,
};

const checkout = {
  lineItems: [
    {
      id: "gid://shopify/CheckoutLineItem/1",
      quantity: 2,
      title: "Test product",
      variant,
    },
  ],
  shippingLine: {price: {amount: 4, currencyCode: "USD"}},
  token: "checkout-token",
  totalPrice: {amount: 29, currencyCode: "USD"},
  totalTax: {amount: 0, currencyCode: "USD"},
};

test("creates production and validation endpoints from extension settings", () => {
  assert.deepEqual(
    createGa4Request({ga4Id: "G-ABC 123", ga4Sec: "secret/value", ga4Debug: "true"}),
    {
      debug: true,
      url: "https://www.google-analytics.com/debug/mp/collect?measurement_id=G-ABC%20123&api_secret=secret%2Fvalue",
    },
  );

  assert.deepEqual(
    createGa4Request({ga4Id: "G-ABC", ga4Sec: "secret", ga4Debug: "false"}),
    {
      debug: false,
      url: "https://www.google-analytics.com/mp/collect?measurement_id=G-ABC&api_secret=secret",
    },
  );

  assert.equal(createGa4Request({ga4Id: "", ga4Sec: "secret"}), null);
});

test("maps product_added_to_cart to a GA4 add_to_cart event", () => {
  const payload = buildGa4Payload({
    clientId: "client-id",
    context,
    data: {
      cartLine: {
        cost: {totalAmount: {amount: 25, currencyCode: "USD"}},
        merchandise: variant,
        quantity: 2,
      },
    },
    name: "product_added_to_cart",
  });

  assert.deepEqual(payload, {
    client_id: "client-id",
    events: [
      {
        name: "add_to_cart",
        params: {
          currency: "USD",
          value: 25,
          items: [
            {
              item_name: "Test product",
              item_id: "gid://shopify/Product/1",
              price: 12.5,
              item_brand: "Test vendor",
              item_variant: "Test product",
              item_list_name: "https://example.com/products/test-product",
              item_list_id: "/products/test-product",
              index: 1,
              quantity: 2,
            },
          ],
        },
      },
    ],
  });
});

test("maps checkout events and tolerates nullable Web Pixels fields", () => {
  for (const [shopifyName, ga4Name] of [
    ["checkout_started", "begin_checkout"],
    ["payment_info_submitted", "add_payment_info"],
  ]) {
    const payload = buildGa4Payload({
      clientId: "client-id",
      context,
      data: {checkout},
      name: shopifyName,
    });

    assert.equal(payload.events[0].name, ga4Name);
  }

  const payload = buildGa4Payload({
    clientId: "client-id",
    context,
    data: {
      checkout: {
        ...checkout,
        lineItems: [...checkout.lineItems, {id: null, quantity: 1, title: null, variant: null}],
        shippingLine: null,
      },
    },
    name: "checkout_completed",
  });

  assert.equal(payload.events[0].name, "purchase");
  assert.equal(payload.events[0].params.shipping, undefined);
  assert.equal(payload.events[0].params.items.length, 1);
  assert.equal(payload.events[0].params.transaction_id, "checkout-token");

  assert.equal(
    buildGa4Payload({
      clientId: "client-id",
      context,
      data: {checkout: {...checkout, totalPrice: null}},
      name: "checkout_started",
    }),
    null,
  );
});

test("ignores events that are not part of the GA4 sample", () => {
  assert.equal(
    buildGa4Payload({clientId: "client-id", name: "page_viewed"}),
    null,
  );
});

test("sends JSON with keepalive and rejects failed responses", async () => {
  const request = createGa4Request({ga4Id: "G-ABC", ga4Sec: "secret"});
  const payload = {client_id: "client-id", events: [{name: "begin_checkout"}]};
  const calls = [];

  const response = await sendGa4Payload(request, payload, async (...args) => {
    calls.push(args);
    return {ok: true, status: 204};
  });

  assert.equal(response.status, 204);
  assert.deepEqual(calls[0][1], {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: true,
  });

  await assert.rejects(
    sendGa4Payload(request, payload, async () => ({ok: false, status: 500})),
    /GA4 returned HTTP 500/,
  );
});
