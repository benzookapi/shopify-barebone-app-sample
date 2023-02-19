import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider, NavigationMenu, TitleBar } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';

// See https://www.npmjs.com/package/@shopify/polaris
import '@shopify/polaris/build/esm/styles.css';

// See https://www.npmjs.com/package/@shopify/react-i18n 
//import translations from "@shopify/polaris/locales/en.json";

import Index from './pages/Index';
import SessionToken from './pages/SessionToken';
import AdminLink from './pages/AdminLink';
import ThemeAppExtension from './pages/ThemeAppExtension';
import FunctionDiscount from './pages/FunctionDiscount';
import FunctionShipping from './pages/FunctionShipping';
import FunctionPayment from './pages/FunctionPayment';
import WebPixel from './pages/WebPixel';
import PostPurchase from './pages/PostPurchase';
import CheckoutUi from './pages/CheckoutUi';


import { _getAdminFromShop, _getShopFromQuery } from "./utils/my_util";

// See https://shopify.dev/apps/tools/app-bridge/getting-started/app-setup
const config = {
  apiKey: API_KEY, // See ../vite.config.js
  host: new URLSearchParams(window.location.search).get("host"),
  forceRedirect: true
  // If false, the page accessed outside admin keeps the location where App Bridge doesn't work.
  // See https://shopify.dev/apps/tools/app-bridge/getting-started/app-setup#initialize-shopify-app-bridge-in-your-app
};

// If the page is accessed directly outside the admin unembedded, shop is used for the host.
// See https://shopify.dev/apps/auth/oauth/getting-started#step-6-redirect-to-your-apps-ui
if (config.host == null) {
  console.log(`The config.host is null, being set from 'shop'.`);
  config.host = window.btoa(_getAdminFromShop(_getShopFromQuery(window))).replace(/=/g, '');
}

console.log(`AppBrige settings: config.apiKey [${config.apiKey}] config.host [${config.host}] config.forceRedirect [${config.forceRedirect}]`);

// All Polaris compoments which you can copy the React snipets from. https://polaris.shopify.com/components
// AppProvider is the base layout compoment. https://polaris.shopify.com/components/app-provider
// See https://shopify.dev/apps/tools/app-bridge/getting-started/using-react
// See https://polaris.shopify.com/components/app-provider 
function App() {
  return (
    <Provider config={config}>
      <NavigationMenu
        navigationLinks={[
          {
            label: 'Session Token',
            destination: '/sessiontoken',
          },
          {
            label: 'Admin Link',
            destination: '/adminlink',
          },
          {
            label: 'Theme App Extension',
            destination: '/themeappextension',
          },
          {
            label: 'Function Discount',
            destination: '/functiondiscount',
          },
          {
            label: 'Function Shipping',
            destination: '/functionshipping',
          },
          {
            label: 'Function Payment',
            destination: '/functionpayment',
          },
          {
            label: 'Web Pixel',
            destination: '/webpixel',
          },
          {
            label: 'Post-purchase',
            destination: '/postpurchase',
          },
          {
            label: 'Checkout UI',
            destination: '/checkoutui',
          },
          {
            label: 'Fulfillment',
            destination: '/fulfillment',
          },
          {
            label: 'Transaction',
            destination: '/transaction',
          },
          {
            label: 'Metaobject',
            destination: '/metaobject',
          },
          {
            label: 'Multipass',
            destination: '/multipass',
          },
          {
            label: 'B2B',
            destination: '/b2b',
          },
          {
            label: 'Bulk Operation',
            destination: '/bulkoperation',
          },
          {
            label: 'ShopifyQL',
            destination: '/shopifyql',
          },
          {
            label: 'Marketing Activity',
            destination: '/marketingactivity',
          },
          {
            label: 'Tokengating',
            destination: '/tokengating',
          },
        ]}
        matcher={(link, location) => link.destination === location.pathname}
      />
      <TitleBar
        title="Welcome to my barebone app  &#x1f600;"
        breadcrumbs={[{ content: "Index", url: '/', target: "APP" }]}
        primaryAction={{ content: 'Code on GitHub', url: 'https://github.com/benzookapi/shopify-barebone-app-sample', target: "REMOTE", external: true }}
        secondaryActions={[{ content: 'Dev. site', url: 'https://shopify.dev/', target: "REMOTE", external: true }]}
        actionGroups={[{ title: 'Shopify JP Blog', actions: [{ content: 'How to build apps / themes', url: 'https://www.shopify.com/jp/blog/partner-shopify-app-development', target: "REMOTE", external: true }] }]}
      />
      {/* Replacing <AppProvider i18n={translations}> for my own use case. */}
      <AppProvider i18n={{
        Polaris: {
          ResourceList: {
            showing: 'Sample Code Index',
          },
        },
      }}>
        {/* <Routes> needs to be inside <AppProvider> */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sessiontoken" element={<SessionToken />} />
            <Route path="/adminlink" element={<AdminLink />} />
            <Route path="/themeappextension" element={<ThemeAppExtension />} />
            <Route path="/functiondiscount" element={<FunctionDiscount />} />
            <Route path="/functionshipping" element={<FunctionShipping />} />
            <Route path="/functionpayment" element={<FunctionPayment />} />
            <Route path="/webpixel" element={<WebPixel />} />
            <Route path="/postpurchase" element={<PostPurchase />} />
            <Route path="/checkoutui" element={<CheckoutUi />} />
          </Routes>
        </BrowserRouter>
        {/* Each page content comes here */}
      </AppProvider>
    </Provider>
  );
}

export default App