import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router';
import styles from './styles.css?url';
import { API_KEY, API_VERSION } from './lib/env.server.js';
import { verifyEmbeddedRequest } from './lib/http.server.js';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export function loader({ request }) {
  const url = new URL(request.url);
  const embedded = url.searchParams.get('embedded') === '1' && verifyEmbeddedRequest(request).ok;
  return { apiKey: API_KEY || '', apiVersion: API_VERSION, embedded };
}

export function Layout({ children }) {
  const { apiKey, apiVersion, embedded } = useLoaderData() || {};
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {embedded && <meta name="shopify-api-key" content={apiKey || ''} />}
        {embedded && <meta name="shopify-api-version" content={apiVersion || ''} />}
        <Meta />
        <Links />
        {embedded && <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>}
        {embedded && <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>}
      </head>
      <body>
        {children}
        {embedded && <ScrollRestoration />}
        {embedded && <Scripts />}
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
