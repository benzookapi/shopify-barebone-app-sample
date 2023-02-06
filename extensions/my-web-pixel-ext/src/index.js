import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, settings, init }) => {
  // See https://shopify.dev/api/pixels/pixel-extension#app-web-pixels
  // See https://shopify.dev/apps/marketing/pixels/getting-started

  //console.log(`Web Pixel register: analytics ${JSON.stringify(analytics, null, 4)}`);
  //console.log(`Web Pixel register: browser ${JSON.stringify(browser, null, 4)}`);
  console.log(`Web Pixel register: settings ${JSON.stringify(settings, null, 4)}`);
  console.log(`Web Pixel register: init ${JSON.stringify(init, null, 4)}`);

  // See https://shopify.dev/api/pixels/customer-events
  analytics.subscribe('all_events', (event) => {
    console.log(`Web Pixel event received: ${JSON.stringify(event, null, 4)}`);
    const shop = event.context.document.location.host;
    const event_data = event;
    event_data.context = {};
    const url = `https://${shop}/apps/bareboneproxy?pixel=true&event_data=${JSON.stringify(event_data)}`;

    console.log(`Web Pixel sending beacon to: ${url}`);

    const httpClient = new XMLHttpRequest();
    httpClient.open("GET", url, false);
    httpClient.send(null);
    const res = JSON.parse(httpClient.responseText);

    console.log(`Web Pixel beacon responded: ${JSON.stringify(res)}`);

  });

});
