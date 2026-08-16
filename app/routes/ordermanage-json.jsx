import { loadOrderManage } from '../lib/order-manage.server.js';

export async function loader({ request }) {
  return loadOrderManage(request);
}
