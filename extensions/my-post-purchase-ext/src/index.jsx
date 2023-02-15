// Simple upsell post-purchase with metafields.
// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension

import { useState } from 'react';
import { extend, render, useExtensionInput, BlockStack, Button, TextContainer, Text, TextBlock, Radio, Layout, CalloutBanner, Banner, Heading, Image } from '@shopify/post-purchase-ui-extensions-react';

/* --- Step 1: Check if current products offer upsells and store the data --- */
// See https://shopify.dev/docs/api/checkout-extensions/extension-points/api#postpurchaseshouldrenderapi
extend('Checkout::PostPurchase::ShouldRender', async ({ inputData, storage }) => {
  console.log(`Post-purchase inputData: ${JSON.stringify(inputData, null, 4)}`);

  // Check if the purchases products have the upsell product ids in their meta fields defined by 'shopify.ui.extension.toml'.
  const upsell_product_ids = inputData.initialPurchase.lineItems.map((item) => {
    const upsell_product_meta = item.product.metafields.find((meta) => {
      return (meta.namespace == 'barebone_app_upsell' && meta.key == 'product_id');
    });
    if (typeof upsell_product_meta !== 'undefined' && upsell_product_meta.value != null) {
      return upsell_product_meta.value;
    }
  });
  console.log(`upsell_product_ids: ${JSON.stringify(upsell_product_ids, null, 4)}`);

  // If the upsell products found, get GraphQL Admin responses of those data from the app server and 
  // store them to the browser storage.
  if (upsell_product_ids.length > 0 && upsell_product_ids[0] != null) {
    // This metafield is filtered by 'shopify.ui.extension.toml' with namespace = "barebone_app" and key = "url".
    const app_url = `${inputData.shop.metafields[0].value}/postpurchase?upsell_product_ids=${JSON.stringify(upsell_product_ids)}&token=${inputData.token}`;

    console.log(`Getting upsell product data from... ${app_url}`);

    const json = await (await fetch(app_url, {
      method: "POST"
    })).json();

    console.log(`${JSON.stringify(json, null, 4)}`);

    // Store the upsell product details from API to the local storage.
    await storage.update({
      "upsell_products": json
    });

    // Notify that the post-purchase shows up.
    return { render: true };

  }
  // Notify that the post-purchase doesn't show up because no upsell products found.
  return { render: false };

});

/* --- Step 2: Rendering Post-purchase UI after the payment --- */
render('Checkout::PostPurchase::Render', () => <App />);

// Render extension result component
// Note that this extension point needs to return remote-ui componet by Shopify which means you cannot create your own standard HTML DOM.
// See https://shopify.dev/docs/api/checkout-extensions/extension-points/api#renderextension
// See https://github.com/Shopify/remote-ui
export function App() {
  const { storage, inputData, calculateChangeset, applyChangeset, done } = useExtensionInput();

  console.log(`storage ${JSON.stringify(storage, null, 4)}`);
  console.log(`inputData ${JSON.stringify(inputData, null, 4)}`);

  const upsell_products = storage.initialData.upsell_products.products.edges;

  const [loading, setLoading] = useState(false);

  const [score, setScore] = useState(2);

  // Change (add) offered products as variant ids to apply the checkout.
  const acceptOffer = async () => {
    const changes = upsell_products.map((product) => {
      // See https://shopify.dev/docs/api/checkout-extensions/extension-points/api#changeset
      // See https://shopify.dev/docs/api/checkout-extensions/extension-points/api#addvariantchange
      return { type: 'add_variant', variantId: product.node.variants.edges[0].node.id.replace('gid://shopify/ProductVariant/', ''), quantity: 1 };
    });
    const app_url = `${inputData.shop.metafields[0].value}/postpurchase?changes=${JSON.stringify(changes)}&token=${inputData.token}`;
    console.log(`Signing the token by... ${app_url}`);
    const json = await (await fetch(app_url, {
      method: "POST"
    })).json();
    console.log(`${JSON.stringify(json, null, 4)}`);

    // Apply change to the current post-purchase page (the next thank you page is not updated).
    // This demo doesn't use this.
    //await calculateChangeset({ changes });

    // Apply change to the transactions.
    await applyChangeset(json.token);
  };

  // Complete this post-purchase flow.
  const complete = async (accept) => {
    setLoading(true);

    if (accept) {
      // Accept the upsell.
      await acceptOffer();
    }

    // Giving the score of the last review.
    const app_url = `${inputData.shop.metafields[0].value}/postpurchase?customerId=${inputData.initialPurchase.customerId}&score=${score}&token=${inputData.token}`;
    console.log(`Updaing the customer metafield with the given score in... ${app_url}`);
    const json = await (await fetch(app_url, {
      method: "POST"
    })).json();
    console.log(`${JSON.stringify(json, null, 4)}`);

    // Complete the flow.    
    done();
  };

  // See https://shopify.dev/docs/api/checkout-extensions/components
  return (
    <BlockStack spacing="loose" alignment="center">
      <CalloutBanner>
        <Text size="large" emphasized>
          Barebone App Post-purchase Demo
        </Text>
      </CalloutBanner>
      <Banner status="info" title="We are offering this product based on your purchased one's metafield." />
      {
        upsell_products.map((product) => {
          return (
            <Layout>
              <BlockStack spacing="tight" alignment="center">
                <Layout media={[
                  { viewportSize: 'small', sizes: [1, 0, 1], maxInlineSize: 0.9 },
                  { viewportSize: 'medium', sizes: [532, 0, 1], maxInlineSize: 420 },
                  { viewportSize: 'large', sizes: [560, 38, 340] },
                ]}>
                  <Image description="product photo" source={product.node.featuredImage.url} />
                </Layout>
                <Heading>{product.node.title}</Heading>
                <TextContainer>
                  <Text size="medium">
                    {product.node.variants.edges[0].node.price} {product.node.priceRangeV2.maxVariantPrice.currencyCode}
                  </Text>
                </TextContainer>
              </BlockStack>
            </Layout>
          )
        })
      }
      <TextContainer>
        <TextBlock emphasized appearance="success">If you have time, could you give me a score for this checkout experience?</TextBlock>
      </TextContainer>
      <Radio name="review" value={3} checked={score == 3} onChange={(b) => {
        if (b) setScore(3);
      }}>
        3 - Excellent
      </Radio>
      <Radio name="review" value={2} checked={score == 2} onChange={(b) => {
        if (b) setScore(2);
      }}>
        2 - Average
      </Radio>
      <Radio name="review" value={1} checked={score == 1} onChange={(b) => {
        if (b) setScore(1);
      }}>
        1 - Poor
      </Radio>
      <Button submit onPress={() => {
        complete(true);
      }} loading={loading}>Love it! I buy now &#127881;</Button>
      <Button plain onPress={() => {
        complete(false);
      }} loading={loading}>No Thanks &#9995;</Button>
    </BlockStack>
  )
}
