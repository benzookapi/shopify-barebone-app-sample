import assert from "node:assert/strict";
import test from "node:test";

test("registers an all_events subscriber with the current Web Pixels package", async () => {
  let extensionPoint;
  let initialize;

  globalThis.shopify = {
    extend(point, callback) {
      extensionPoint = point;
      initialize = callback;
    },
  };

  await import("./index.js");

  let subscriptionName;
  initialize({
    analytics: {
      subscribe(name) {
        subscriptionName = name;
      },
    },
    settings: {
      ga4Id: "G-ABC",
      ga4Sec: "secret",
      ga4Debug: "false",
    },
  });

  assert.equal(extensionPoint, "WebPixel::Render");
  assert.equal(subscriptionName, "all_events");
});
