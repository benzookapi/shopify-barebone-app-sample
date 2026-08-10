import { createRedirect, RedirectAction } from "../utils/app-bridge";
import { getAdminFromShop, getCurrentHost, getShopFromLocation } from "../utils/shop";


// Theme App Extension sample with App Proxies
// Read https://shopify.dev/apps/online-store/theme-app-extensions
// Read https://shopify.dev/apps/online-store/app-proxies
function ThemeApp() {
    const redirect = createRedirect();

    const shop = getShopFromLocation();

    return (
        <s-page heading="Theme App Extension usage of Schema, Metafields and App Proxies for server communication">
            <s-stack direction="block" gap="large">
                <s-section>
                    <s-stack direction="block" gap="base">
                        <s-box>
                            <s-link href="https://shopify.dev/apps/online-store/theme-app-extensions/extensions-framework" target="_blank">Dev. doc</s-link>
                        </s-box>
                        <s-box>
                            <s-ordered-list>
                                <s-list-item>
                                    <s-button variant="primary" onClick={() => {
                                        // Read https://shopify.dev/apps/online-store/theme-app-extensions/extensions-framework#simplified-installation-flow-with-deep-linking
                                        const apiKey = document.querySelector('meta[name="shopify-api-key"]')?.content || '';
                                        const path = `/themes/current/editor?context=apps&activateAppId=${apiKey}/app-embed-block`;
                                        console.log(path);
                                        redirect.dispatch(RedirectAction.ADMIN_PATH, {
                                            path: path,
                                            newContext: true
                                        });
                                    }}>
                                        Active your extension settings in the theme editor
                                    </s-button> with <s-link href={`https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#deep-linking`} target="_blank">deep link</s-link>

                                </s-list-item>
                                <s-list-item>Add <s-link href={`https://${ getAdminFromShop(shop)}/settings/custom_data`} target="_blank">Metafields</s-link> for <s-badge tone='info'>Products</s-badge>
                                    in type of <s-badge>Product</s-badge> and <s-badge>Single line text</s-badge> and go to the app block section in the theme editor ('Home page' and 'Default product') to set the metafields above with
                                    <s-link href={`https://help.shopify.com/en/manual/online-store/themes/theme-structure/sections-and-blocks`} target="_blank">Dynamic sources</s-link>
                                    (don't forget to set Metafields to <s-link href={`https://${ getAdminFromShop(shop)}/products`} target="_blank">Products</s-link>)
                                </s-list-item>
                            </s-ordered-list>
                        </s-box>
                    </s-stack>
                </s-section>
                <s-section>
                    <s-stack direction="block" gap="base">
                        <s-box>
                            <s-link href="https://shopify.dev/apps/online-store/app-proxies" target="_blank">Dev. doc</s-link>
                        </s-box>
                        <s-box>
                            <s-ordered-list>
                                <s-list-item>
                                    Subpath prefix: <s-badge>apps</s-badge> Subpath: <s-badge>bareboneproxy</s-badge> Proxy URL: <s-badge>https://{getCurrentHost()}/appproxy</s-badge>
                                </s-list-item>
                                <s-list-item>
                                    <s-link href={`https://${shop}/apps/bareboneproxy?your_param=your_value`} target="_blank">Test your proxy</s-link>
                                </s-list-item>
                                <s-list-item>
                                    Check <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> to see how your set extensions show up switching the pages of home and products.
                                </s-list-item>
                            </s-ordered-list>
                        </s-box>
                    </s-stack>
                </s-section>
            </s-stack>
        </s-page>
    );
}

export default ThemeApp
