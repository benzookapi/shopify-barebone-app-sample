import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Provider } from '@shopify/app-bridge-react';

// See https://www.npmjs.com/package/@shopify/polaris
import '@shopify/polaris/build/esm/styles.css';

import Index from './pages/Index';
import SessionToken from './pages/SessionToken';

// See https://shopify.dev/apps/tools/app-bridge/getting-started/app-setup
const config = {
  apiKey: API_KEY, // See ../vite.config.js
  host: new URLSearchParams(location.search).get("host"),
  forceRedirect: true
};

function App() {

  return (
    <BrowserRouter>
      <Provider config={config}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sessiontoken" element={<SessionToken />} />
        </Routes>
      </Provider>
    </BrowserRouter>
  );
}

export default App