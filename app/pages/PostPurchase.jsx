import { useState } from 'react';
import { useLoaderData } from 'react-router';
import { callDirectAdminGraphql } from '../utils/direct-admin-graphql';
import { createRedirect, RedirectAction } from "../utils/app-bridge";
import { getAdminFromShop, getCurrentHost } from "../utils/shop";

const GET_SHOP_ID = `query ShopId {
  shop {
    id
  }
}`;

const SET_SHOP_METAFIELD = `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      value
    }
    userErrors {
      field
      message
    }
  }
}`;


// Post-purchase sample
// Read https://shopify.dev/docs/api/checkout-extensions/extension-points
// Read https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension
function PostPurchase() {
  const redirect = createRedirect();
  const { shop } = useLoaderData();

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <s-page heading="Post-purchase sample for switching products to upsell and getting shop review scores with metafields">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/checkout-extensions/extension-points" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <p>
                    Add the following <s-link href={`https://${ getAdminFromShop(shop)}/settings/custom_data`} target="_blank">metafields</s-link> used by this post-purchase manually.
                  </p>
                  <s-unordered-list>
                    <s-list-item>
                      <p>Namespace and key: <s-badge>barebone_app_upsell.product_id</s-badge> for <s-badge tone='info'>Products</s-badge> in type of <s-badge>Single line text</s-badge>
                        (This needs <b>'storefronts'</b> checked) which has <b>product ids to upsell passed to the post-purchase flow</b>.
                      </p>
                    </s-list-item>
                    <s-list-item>
                      <p>Namespace and key: <s-badge>barebone_app_review.score</s-badge> for <s-badge tone='info'>Customers</s-badge> in type of <s-badge>Integer</s-badge>
                        which has <b>reviw scores given by customers in the post-purchase flow</b>.
                      </p>
                    </s-list-item>
                  </s-unordered-list>
                </s-list-item>
                <s-list-item>
                  <p>
                    Add this app raw URL (<s-badge>https://{getCurrentHost()}</s-badge>) to <s-badge tone='info'>Shop</s-badge> metafields which is invisible in admin and accessible through this app's API call only.
                  </p>
                  <s-button variant="primary" onClick={() => {
                    setAccessing(true);
                    const errors = { errors: 0, apis: [] };
                    callDirectAdminGraphql(GET_SHOP_ID).then((shopResponse) => {
                      return callDirectAdminGraphql(SET_SHOP_METAFIELD, {
                        metafields: [
                          {
                            key: 'url',
                            namespace: 'barebone_app',
                            ownerId: shopResponse.data.shop.id,
                            type: 'single_line_text_field',
                            value: window.location.origin,
                          },
                        ],
                      });
                    }).then((response) => {
                      const userErrors = response.data.metafieldsSet.userErrors;
                      if (userErrors.length > 0) {
                        errors.errors += 1;
                        errors.apis.push(`shop ${JSON.stringify(userErrors[0])}`);
                      }
                      console.log(JSON.stringify(errors, null, 4));
                      setAccessing(false);
                      if (errors.errors == 0) {
                        setResult('Success!');
                      } else {
                        setResult(`Error! ${JSON.stringify(errors)}`);
                      }
                    }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        errors.errors += 1;
                        errors.apis.push(`shop ${e.message}`);
                        setResult(`Error! ${JSON.stringify(errors)}`);
                    });
                  }}>
                    Add the app URL to shop metafields
                  </s-button>&nbsp;
                  <s-badge tone='info'>Result: <APIResult res={result} loading={accessing} /></s-badge>
                </s-list-item>
                <s-list-item>
                  <p>
                    Set each <s-badge>product id (the last number of its detail page URL)</s-badge> to each <s-badge>barebone_app_upsell.product_id</s-badge> of <s-link href={`https://${ getAdminFromShop(shop)}/products`} target="_blank">products</s-link> for
                    those you want to upsell (e.g. purchasing a product A with a product B's id offers a B in the post-purchase).
                  </p>
                </s-list-item>
                <s-list-item>
                  <p>
                    Select this app in <s-badge tone='info'>Post-purchase page</s-badge> of <s-link href={`https://${ getAdminFromShop(shop)}/settings/checkout`} target="_blank">checkout settings</s-link> to enable this Post-purchase.
                  </p>
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <p>
                    Visit <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> to check how your upsells work at your post-purchase.
                    <b>Note that Post-purchase extensions only show up when you use a credit card payment method</b> (i.e. Shopify Payment or Bogus Gateway in general). Any other methods like wallets and
                    3rd party payment apps don't show that flow.  See <s-link href={`https://shopify.dev/docs/apps/checkout/post-purchase#limitations-and-considerations`} target="_blank">this limitations</s-link>.
                  </p>
                </s-list-item>
                <s-list-item>
                  <p>
                    You can check the post purchases in <s-link href={`https://${ getAdminFromShop(shop)}/orders`} target="_blank">orders </s-link> with each detail page (you'll see appended items and transactions there).
                  </p>
                  <p>
                    Also, you can check the review score of each buyer in <s-badge>barebone_app_review.score</s-badge> metafield of <s-link href={`https://${ getAdminFromShop(shop)}/customers`} target="_blank">customers</s-link>.
                  </p>
                </s-list-item>
              </s-ordered-list>
            </s-box>
            <s-box>
              <p>
                <b>TIPS: </b>This post-purchase communicates with the app raw endpoint over <s-link href={`https://shopify.dev/docs/api/checkout-extensions/extension-points#web-platform-globals`} target="_blank">CORS</s-link> with a <s-link href={`https://shopify.dev/docs/api/checkout-extensions/post-purchase/jwt-specification`} target='_blank'>token</s-link> for sensitive data like shop and customer ids as <s-link href="#" onClick={(event) => {
                  event.preventDefault();
                  redirect.dispatch(RedirectAction.APP, '/sessiontoken');
                }}>
                  Session Token sample
                </s-link> does. For security considerations, check <s-link href="https://shopify.dev/docs/apps/build/checkout/capabilities#network-access" target='_blank'>this page</s-link>, too.
              </p>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
  }
  return (<span>{props.res}</span>);
}

export default PostPurchase
