import {register} from "@shopify/web-pixels-extension";

import {
  buildGa4Payload,
  createGa4Request,
  sendGa4Payload,
} from "./ga4.js";

register(({analytics, settings}) => {
  const request = createGa4Request(settings);

  if (!request) {
    console.error("[Web Pixel] GA4 measurement ID and API secret are required.");
    return;
  }

  analytics.subscribe("all_events", (event) => {
    console.debug(`[Web Pixel] Event received: ${event.name}`);

    const payload = buildGa4Payload(event);
    if (!payload) return;

    void sendGa4Payload(request, payload)
      .then(async (response) => {
        const eventName = payload.events[0].name;

        if (request.debug) {
          const result = await response.json();
          const validationMessages = result.validationMessages ?? [];

          if (validationMessages.length > 0) {
            console.warn(
              `[Web Pixel] GA4 validation failed for ${eventName}.`,
              validationMessages,
            );
            return;
          }
        }

        console.debug(`[Web Pixel] Sent ${eventName} to GA4.`);
      })
      .catch((error) => {
        console.error("[Web Pixel] Failed to send an event to GA4.", error);
      });
  });
});
