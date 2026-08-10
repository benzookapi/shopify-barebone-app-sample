import { loadBulkOperation } from '../lib/order-and-bulk.server.js';

export async function loader({ request }) {
  return loadBulkOperation(request);
}
