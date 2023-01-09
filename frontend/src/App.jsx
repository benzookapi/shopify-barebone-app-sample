import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';

// See https://www.npmjs.com/package/@shopify/polaris
import '@shopify/polaris/build/esm/styles.css';

// See https://www.npmjs.com/package/@shopify/react-i18n 
//import translations from "@shopify/polaris/locales/en.json";

import Index from './pages/Index';
import SessionToken from './pages/SessionToken';

// See https://shopify.dev/apps/tools/app-bridge/getting-started/app-setup
const config = {
  apiKey: API_KEY, // See ../vite.config.js
  host: new URLSearchParams(location.search).get("host"),
  forceRedirect: true
};

// All Polaris compoments which you can copy the React snipets from. https://polaris.shopify.com/components
// AppProvider is the base layout compoment. https://polaris.shopify.com/components/app-provider
// See https://shopify.dev/apps/tools/app-bridge/getting-started/using-react
// See https://polaris.shopify.com/components/app-provider 
function App() {

  return (
    // <Routes> needs to be inside <Provider>
    // Replacing <AppProvider i18n={translations}> for my own use case.   
    <Provider config={config}>
      <AppProvider i18n={{
        Polaris: {
          ResourceList: {
            showing: 'Simple App Samples',
          },
        },
      }}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sessiontoken" element={<SessionToken />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </Provider>
  );
}

export default App