import { loadBulkOperation } from '../lib/bulk-operation.server.js';

export async function loader({ request }) {
  return loadBulkOperation(request);
}
