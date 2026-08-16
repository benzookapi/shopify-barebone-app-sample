import { loadBulkOperation, uploadBulkOperation } from '../lib/bulk-operation.server.js';

export async function loader({ request }) {
  return loadBulkOperation(request);
}

export async function action({ request }) {
  return uploadBulkOperation(request);
}
