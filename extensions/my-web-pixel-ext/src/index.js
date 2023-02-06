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

    const name = event.name;

    // Exclude 'page_view' events to avoid to many dump.
    if (name == 'page_viewed') return;

    const shop = event.context.document.location.host;
    const event_data = event;
    event_data.context = {};
    const url = `${settings.pixelUrl}?shop=${shop}&event_data=${JSON.stringify(event_data)}`;

    console.log(`Web Pixel sending beacon to: ${url}`);

    // See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(event_data)
    }).then((res) => {
      res.json()
    }).then((data) => {
      console.log(`Web Pixel beacon responded:`)
    });

    const ga4 = `${settings.ga4}`;

    if (ga4 != 'true') return;

    /* switch (name) {
       case 'checkout_started':
         // See https://shopify.dev/api/pixels/customer-events#checkout_started
         // THIS EVENT CANNOT BE PASSED BY GA TAG IN THEME APP EXTENSION, ONLY BY WEB PIXEL DURING CHECKOUT PROCESS.
         
         // Send event data to GA4 (begin_checkout)
         // See https://developers.google.com/tag-manager/ecommerce-ga4
         // See https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?hl=ja&client_type=gtag
 
         const measurement_id = `G-XXXXXXXXXX`;
         const api_secret = `<secret_value>`;
 
         fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`, {
           method: "POST",
           body: JSON.stringify({
             client_id: 'XXXXXXXXXX.YYYYYYYYYY',
             events: [{
               name: 'begin_checkout',
               params: {
                 ecommerce: {
                   items: [{
                     item_name: "Donut Friday Scented T-Shirt", // Name or ID is required.
                     item_id: "67890",
                     price: 33.75,
                     item_brand: "Google",
                     item_category: "Apparel",
                     item_category2: "Mens",
                     item_category3: "Shirts",
                     item_category4: "Tshirts",
                     item_variant: "Black",
                     item_list_name: "Search Results",
                     item_list_id: "SR123",
                     index: 1,
                     quantity: 1
                   }]
                 }
               },
             }]
           })
         });
 
         return;
       default:
         // Other events
         return;
     }*/

  });

});
