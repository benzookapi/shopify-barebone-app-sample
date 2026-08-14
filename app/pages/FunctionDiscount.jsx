import { useState, useCallback } from 'react';
import { useLoaderData } from 'react-router';
import { callDirectAdminGraphql } from '../utils/direct-admin-graphql';
import { getAdminFromShop } from "../utils/shop";

const CREATE_DISCOUNT = `mutation DiscountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
  discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
    automaticAppDiscount {
      discountClasses
      discountId
      title
      startsAt
    }
    userErrors {
      field
      message
    }
  }
}`;


// Shopify Functions for discounts sample
// Read https://shopify.dev/docs/api/functions/latest/discount
function FunctionDiscount() {
  const { shop } = useLoaderData();

  const [meta, setMeta] = useState('barebone_app.discount_rate');
  const metaChange = useCallback((newMeta) => setMeta(newMeta), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <s-page heading="Create your original order discount with Shopify Functions">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/functions/latest/discount" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>Add <s-link href={`https://${ getAdminFromShop(shop)}/settings/custom_data`} target="_blank">Metafields</s-link> for <s-badge tone='info'>Customers</s-badge>
                  in type of <s-badge>Integer</s-badge> and input your Metafield <s-badge>Namespace and key</s-badge>
                  <s-text-field label="Customer metafield namespace and key" labelAccessibilityVisibility="exclusive" value={meta} onInput={(event) => metaChange(event.currentTarget.value)} placeholder="Example: barebone_app.discount_rate"></s-text-field>
                </s-list-item>
                <s-list-item>
                  Set the Metafields to <s-link href={`https://${ getAdminFromShop(shop)}/customers`} target="_blank">Customers</s-link> to specify how much discounted they get as a number
                  (e.g. 30 = 30% discounted)
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountAutomaticAppCreate" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <s-button variant="primary" onClick={() => {
                    setAccessing(true);
                    const [namespace, key] = meta.split('.');
                    callDirectAdminGraphql(CREATE_DISCOUNT, {
                      automaticAppDiscount: {
                        combinesWith: {
                          orderDiscounts: true,
                          productDiscounts: true,
                          shippingDiscounts: true,
                        },
                        discountClasses: ['ORDER'],
                        functionHandle: 'my-function-discount-ext',
                        metafields: [
                          {
                            key: 'customer_meta',
                            namespace: 'barebone_app_function_discount',
                            type: 'json',
                            value: JSON.stringify({ namespace, key }),
                          },
                        ],
                        startsAt: new Date().toISOString(),
                        title: `Barebone App Function Discount - ${new Date().toISOString()}`,
                      },
                    }).then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.data.discountAutomaticAppCreate.userErrors.length == 0) {
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
                    Register your discount
                  </s-button>&nbsp;
                  <s-badge tone='info'>Result: <APIResult res={result} loading={accessing} /></s-badge>
                </s-list-item>
                <s-list-item>
                  Go to <s-link href={`https://${ getAdminFromShop(shop)}/discounts`} target="_blank">Discounts</s-link> to check if the discount is activated and visit <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> to see how your discount works with your specified customers
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
    return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
  }
  return (<span>{props.res}</span>);
}

export default FunctionDiscount
