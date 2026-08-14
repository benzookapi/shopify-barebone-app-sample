import { useState, useCallback } from 'react';
import { useLoaderData } from 'react-router';
import { callDirectAdminGraphql } from '../utils/direct-admin-graphql';
import { getAdminFromShop } from "../utils/shop";

const CREATE_DELIVERY_CUSTOMIZATION = `mutation DeliveryCustomizationCreate($deliveryCustomization: DeliveryCustomizationInput!) {
  deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
    deliveryCustomization {
      enabled
      id
      title
      metafields(first: 10) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`;


// Shopify Functions for shipping method sample
// Read https://shopify.dev/docs/api/functions/latest/delivery-customization
function FunctionShipping() {
  const { shop } = useLoaderData();

  const [rate, setRate] = useState('Standard');
  const rateChange = useCallback((newRate) => setRate(newRate), []);

  const [zip, setZip] = useState('100-0001');
  const zipChange = useCallback((newZip) => setZip(newZip), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <s-page heading="Create your original shipping rate filtering with Shopify Functions">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/functions/latest/delivery-customization" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>Input a <s-badge>shipping rate name</s-badge> which you want to show only, from <s-link href={`https://${ getAdminFromShop(shop)}/settings/shipping`} target="_blank">shipping settings</s-link>.
                  <s-text-field label="Shipping rate name" labelAccessibilityVisibility="exclusive" value={rate} onInput={(event) => rateChange(event.currentTarget.value)} placeholder="Example: Standard"></s-text-field>
                </s-list-item>
                <s-list-item>Input a <s-badge>zip code</s-badge> which buyers input in their shipping address when the shipping rate shows up above.
                  <s-text-field label="Shipping zip code" labelAccessibilityVisibility="exclusive" value={zip} onInput={(event) => zipChange(event.currentTarget.value)} placeholder="Example: 100-0001"></s-text-field>
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/deliveryCustomizationCreate" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <s-button variant="primary" onClick={() => {
                    setAccessing(true);
                    callDirectAdminGraphql(CREATE_DELIVERY_CUSTOMIZATION, {
                      deliveryCustomization: {
                        enabled: true,
                        functionHandle: 'my-function-shipping-ext',
                        metafields: [
                          {
                            key: 'filter',
                            namespace: 'barebone_app_function_shipping',
                            type: 'json',
                            value: JSON.stringify({ rate, zip }),
                          },
                        ],
                        title: 'Barebone App Function Shipping',
                      },
                    }).then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.data.deliveryCustomizationCreate.userErrors.length == 0) {
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
                    Create your delivery customization
                  </s-button>&nbsp;
                  <s-badge tone='info'>Result: <APIResult res={result} loading={accessing} /></s-badge>
                </s-list-item>
                <s-list-item>
                  Go to <s-link href={`https://${ getAdminFromShop(shop)}/settings/shipping`} target="_blank">shipping settings</s-link> to check if the customization is created and visit <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> to see how your customization works with your input zip code.
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

export default FunctionShipping
