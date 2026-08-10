import { mockLogin } from '../lib/public-endpoints.server.js';

export async function loader({ request }) {
  return mockLogin(request);
}
