import { stockLevels } from '../lib/public-endpoints.server.js';

export async function loader({ request }) {
  return stockLevels(request);
}
