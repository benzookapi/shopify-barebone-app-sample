import { webhookAction } from '../lib/public-endpoints.server.js';

export async function action({ request }) {
  return webhookAction(request);
}
