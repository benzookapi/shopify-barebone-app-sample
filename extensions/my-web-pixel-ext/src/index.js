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

    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${settings.ga4Id}&api_secret=${settings.ga4Sec}`;

    const body = {
      client_id: `${event.clientId}`,
      events: [{
        name: '',
        params: {
          ecommerce: {
            items: []
          }
        },
      }]
    };

    // See https://shopify.dev/api/pixels/customer-events#checkout_started
    // THIS EVENT CANNOT BE PASSED BY GA TAG IN THEME APP EXTENSION, ONLY BY WEB PIXEL DURING CHECKOUT PROCESS.

    // Send event data to GA4 (begin_checkout)
    // See https://developers.google.com/tag-manager/ecommerce-ga4
    // See https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?hl=ja&client_type=gtag

    let name = null;
    let items = null;
    switch (event.name) {
      case 'product_added_to_cart':
        name = 'add_to_cart';
        items = [{
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
        name = 'begin_checkout';
        items = event.data.checkout.lineItems.map((item, i) => {
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
        name = 'purchase';
        items = event.data.checkout.lineItems.map((item, i) => {
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

    if (name == null) return;

    body.events[0].name = name;
    body.events[0].params.ecommerce.items = items;

    if (name == 'purchase') {
      body.events[0].params.ecommerce.transaction_id = event.data.checkout.token;
      //body.events[0].params.ecommerce.affiliation = '';
      body.events[0].params.ecommerce.value = event.data.checkout.totalPrice.amount;
      body.events[0].params.ecommerce.tax = event.data.checkout.totalTax.amount;
      body.events[0].params.ecommerce.shipping = event.data.checkout.shippingLine.price.amount;
      body.events[0].params.ecommerce.currency = event.data.checkout.currencyCode;
      //body.events[0].params.ecommerce.coupon = '';
    }

    console.log(`Web Pixel sending 'begin_checkout' of GA4... ${JSON.stringify(body, null, 4)} to ${ga4Url}`);
    fetch(ga4Url, {
      method: "POST",
      headers: {
        //'Content-Type': 'application/json', // This produce CORS error!
        // 'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(res => {
      console.log(`${JSON.stringify(res, null, 4)}`);
    }).catch(e => {
      console.log(`${e}`);
    });

  });

});
