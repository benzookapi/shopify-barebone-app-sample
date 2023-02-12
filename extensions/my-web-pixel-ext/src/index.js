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

    // NOTE THAT IF YOU WANT TO SEND THIS EVENT DATA TO YOUR APP, YOU NEED IT CORS-FREE ACCESSIBLE 
    // BECAUSE THIS WEB WORKER IS A SANDBOX, A STANDALONE BACKEND PROCESS IN BROWSERS 
    // WITH ALL EXTERNAL ACCESS TAKEN FOR CROSS-ORIGIN.
    // See https://developer.mozilla.org/en-US/docs/Glossary/CORS
    // See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API  

    // Note that GA4 endpoint doesn't respond errors even though you've given the wrong request. 
    // If you want to check your request, you need to access the debug URL adding 'debug' as '.com/debug/mp/collect?'.
    // See https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events?client_type=gtag

    let debug = '';
    if (settings.ga4Debug == 'true') debug = 'debug/';

    const ga4Url = `https://www.google-analytics.com/${debug}mp/collect?measurement_id=${settings.ga4Id}&api_secret=${settings.ga4Sec}`;

    const body = {
      client_id: `${event.clientId}`,
      events: [{
        name: '',
        params: {
          items: []
        },
      }]
    };

    // THE FOLLOWING EVENTS CANNOT BE PASSED BY GA TAG IN THEME APP EXTENSION, ONLY BY WEB OR CUSTOM PIXELS DURING CHECKOUT PROCESS.
    // See https://shopify.dev/api/pixels/customer-events#checkout_started
    // See https://shopify.dev/docs/api/pixels/customer-events#payment_info_submitted
    // See https://shopify.dev/docs/api/pixels/customer-events#checkout_completed

    // Send event data to GA4
    // See https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag
    // See https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?hl=ja&client_type=gtag

    switch (event.name) {
      case 'product_added_to_cart':
        body.events[0].name = 'add_to_cart';
        body.events[0].params.currency = event.data.cartLine.cost.totalAmount.currencyCode;
        body.events[0].params.value = event.data.cartLine.cost.totalAmount.amount;
        body.events[0].params.items = [{
          "item_name": `${event.data.cartLine.merchandise.product.title}`,
          "item_id": `${event.data.cartLine.merchandise.product.id}`,
          "price": event.data.cartLine.merchandise.price.amount,
          "item_brand": `${event.data.cartLine.merchandise.product.vendor}`,
          //"item_category": "Apparel",
          //"item_category2": "Mens",
          //"item_category3": "Shirts",
          //"item_category4": "Tshirts",
          "item_variant": `${event.data.cartLine.merchandise.product.title}`,
          "item_list_name": `${event.context.document.location.href}`,
          "item_list_id": `${event.context.document.location.pathname}`,
          "index": 1,
          "quantity": event.data.cartLine.quantity
        }];
        break;
      case 'checkout_started':
        body.events[0].name = 'begin_checkout';
        body.events[0].params.currency = event.data.checkout.totalPrice.currencyCode;
        body.events[0].params.value = event.data.checkout.totalPrice.amount;
        //body.events[0].params.coupon = 'Discount name?';
        body.events[0].params.items = event.data.checkout.lineItems.map((item, i) => {
          return {
            "item_name": `${item.title}`,
            "item_id": `${item.id}`,
            "price": item.variant.price.amount,
            "item_brand": `${item.variant.product.vendor}`,
            "item_variant": `${item.variant.product.title}`,
            "item_list_name": `${event.context.document.location.href}`,
            "item_list_id": `${event.context.document.location.pathname}`,
            "index": i,
            "quantity": item.quantity
          }
        });
        break;
      case 'payment_info_submitted':
        body.events[0].name = 'add_payment_info';
        body.events[0].params.currency = event.data.checkout.totalPrice.currencyCode;
        body.events[0].params.value = event.data.checkout.totalPrice.amount;
        //body.events[0].params.coupon = 'Discount name?';
        //body.events[0].params.payment_type = 'Not available?';
        body.events[0].params.items = event.data.checkout.lineItems.map((item, i) => {
          return {
            "item_name": `${item.title}`,
            "item_id": `${item.id}`,
            "price": item.variant.price.amount,
            "item_brand": `${item.variant.product.vendor}`,
            "item_variant": `${item.variant.product.title}`,
            "item_list_name": `${event.context.document.location.href}`,
            "item_list_id": `${event.context.document.location.pathname}`,
            "index": i,
            "quantity": item.quantity
          }
        });
        break;
      case 'checkout_completed':
        body.events[0].name = 'purchase';
        body.events[0].params.transaction_id = event.data.checkout.token;
        body.events[0].params.value = event.data.checkout.totalPrice.amount;
        body.events[0].params.tax = event.data.checkout.totalTax.amount;
        body.events[0].params.shipping = event.data.checkout.shippingLine.price.amount;
        body.events[0].params.currency = event.data.checkout.totalPrice.currencyCode;
        //body.events[0].params.coupon = 'Discount name?';     
        body.events[0].params.items = event.data.checkout.lineItems.map((item, i) => {
          return {
            "item_name": `${item.title}`,
            "item_id": `${item.id}`,
            "price": item.variant.price.amount,
            "item_brand": `${item.variant.product.vendor}`,
            "item_variant": `${item.variant.product.title}`,
            "item_list_name": `${event.context.document.location.href}`,
            "item_list_id": `${event.context.document.location.pathname}`,
            "index": i,
            "quantity": item.quantity
          }
        });
        break;
      default:
        // Other events     
        break;
    }

    if (body.events[0].name == '') return;

    console.log(`Web Pixel sending '${body.events[0].name}' of GA4... ${JSON.stringify(body, null, 4)} to ${ga4Url}`);
    fetch(ga4Url, {
      method: "POST",
      body: JSON.stringify(body)
    }).then(res => {
      console.log(`GA4 response: ${JSON.stringify(res, null, 4)}`);
    }).catch(e => {
      console.log(`GA4 error: ${e}`);
    });

  });

});
