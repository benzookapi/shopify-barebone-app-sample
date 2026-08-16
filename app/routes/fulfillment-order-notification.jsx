import { fulfillmentOrderNotification } from '../lib/public-endpoints.server.js';

export async function action({ request }) {
  return fulfillmentOrderNotification(request);
}
