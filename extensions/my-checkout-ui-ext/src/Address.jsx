// Checkout UI sample for address suggestion.
// See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/targets/address/purchase-address-autocomplete-suggest

import { extension } from '@shopify/ui-extensions/checkout';

export default extension(
    'purchase.address-autocomplete.suggest',
    async ({ signal, target }) => {
        console.log(`my-checkout-ui-ext (Address): signal ${JSON.stringify(signal, null, 4)}`);
        console.log(`my-checkout-ui-ext (Address): target ${JSON.stringify(target, null, 4)}`);

        // 1. Use the query term the buyer entered
        const { field, value } = target;
        console.log(`my-checkout-ui-ext (Address): field ${JSON.stringify(field, null, 4)}`);
        console.log(`my-checkout-ui-ext (Address): value ${JSON.stringify(value, null, 4)}`);

        // 2. Fetch address suggestions
        /*const response = await fetch(
          `https://myapp.com/api/address-suggestions?query=${value}&field=${field}`,
          {signal},
        );*/

        // 3. Map response data to expected format
        //const {data} = await response.json();

        const data = [];
        data.push({
            id: "MyId123",
            label: "My Label",
            matchedSubstrings: [],
            address1: "address1",
            address2: "address2",
            city: "Chiyoda",
            zip: "1000001",
            provinceCode: "JP-13",
            countryCode: "JP"
        });

        const suggestions = data.map((suggestion) => {
            return {
                id: suggestion.id,
                label: suggestion.label,
                matchedSubstrings:
                    suggestion.matchedSubstrings,
                formattedAddress: {
                    address1: suggestion.address1,
                    address2: suggestion.address2,
                    city: suggestion.city,
                    zip: suggestion.zip,
                    provinceCode: suggestion.provinceCode,
                    countryCode: suggestion.countryCode,
                },
            };
        });

        // 4. Return up to five address suggestions
        return {
            suggestions: suggestions.slice(0, 5),
        };
    },
);
