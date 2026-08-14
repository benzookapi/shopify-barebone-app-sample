import { useCallback, useState } from 'react';
import { useLoaderData } from 'react-router';
import { callDirectAdminGraphql } from '../utils/direct-admin-graphql';
import { getAdminFromShop } from '../utils/shop';

const CREATE_CART_TRANSFORM = `mutation CartTransformCreate($functionHandle: String!, $metafields: [MetafieldInput!]) {
  cartTransformCreate(functionHandle: $functionHandle, metafields: $metafields) {
    cartTransform {
      id
    }
    userErrors {
      field
      message
    }
  }
}`;


// Shopify Cart Transform Function sample
// Read https://shopify.dev/docs/api/functions/latest/cart-transform
function FunctionCart() {
  const { shop } = useLoaderData();

  const [meta, setMeta] = useState('barebone_app.discount_rate');
  const metaChange = useCallback((newMeta) => setMeta(newMeta), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <s-page heading="Increase cart line prices with Shopify Functions">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/functions/latest/cart-transform" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  Use the same <s-link href={`https://${ getAdminFromShop(shop)}/settings/custom_data`} target="_blank">Customer metafield</s-link> as the Function Discount sample and input its <s-badge>Namespace and key</s-badge>.
                  <s-text-field label="Customer metafield namespace and key" labelAccessibilityVisibility="exclusive" value={meta} onInput={(event) => metaChange(event.currentTarget.value)} placeholder="Example: barebone_app.discount_rate"></s-text-field>
                </s-list-item>
                <s-list-item>
                  Set the metafield on <s-link href={`https://${ getAdminFromShop(shop)}/customers`} target="_blank">Customers</s-link>. A value of <s-badge>30</s-badge> increases each eligible product price by 30%, making it 1.30 times the original price.
                </s-list-item>
                <s-list-item>
                  Price updates are available only on development stores or stores on the Shopify Plus plan. Products with selling plans are left unchanged.
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/cartTransformCreate" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <s-button variant="primary" onClick={() => {
                    setAccessing(true);
                    const [namespace, key] = meta.split('.');
                    callDirectAdminGraphql(CREATE_CART_TRANSFORM, {
                      functionHandle: 'my-function-cart-ext',
                      metafields: [
                        {
                          key: 'customer_meta',
                          namespace: 'barebone_app_function_cart',
                          type: 'json',
                          value: JSON.stringify({ namespace, key }),
                        },
                      ],
                    }).then((json) => {
                      console.log(JSON.stringify(json, null, 4));
                      setAccessing(false);
                      if (json.data.cartTransformCreate.userErrors.length == 0) {
                        setResult('Success!');
                      } else {
                        setResult('Error!');
                      }
                    }).catch((e) => {
                      console.log(`${e}`);
                      setAccessing(false);
                      setResult('Error!');
                    });
                  }}>
                    Register your cart transform
                  </s-button>&nbsp;
                  <s-badge tone="info">Result: <APIResult res={result} loading={accessing} /></s-badge>
                </s-list-item>
                <s-list-item>
                  An app can register one Cart Transform per store. After registration, sign in as a configured customer and visit <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> to check the updated prices.
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <s-spinner accessibilityLabel="Calling Cart Transform GraphQL"></s-spinner>;
  }
  return (<span>{props.res}</span>);
}

export default FunctionCart;
