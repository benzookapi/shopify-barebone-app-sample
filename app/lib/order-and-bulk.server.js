import { v4 as uuidv4 } from 'uuid';
import { authenticatedEndpoint } from './embedded.server.js';
import { embeddedHtmlData, json } from './http.server.js';
import { verifyShopifyHmac } from './shopify-auth.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';
import { getPublicOrigin } from './public-url.server.js';

export async function loadOrderManage(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('embedded') === '1') {
    if (!verifyShopifyHmac(url.searchParams)) return new Response('HMAC verification failed', { status: 400 });
    const shop = url.searchParams.get('shop');
    if (!shop) return new Response('Missing shop', { status: 400 });
    return embeddedHtmlData(shop);
  }

  return authenticatedEndpoint(request, async (context) => {
    let error = '';
    let response = { data: {} };
    const id = url.searchParams.get('id');
    if (id) {
      const orderId = `gid://shopify/Order/${id}`;
      const foids = url.searchParams.get('foids');
      if (foids) {
        for (const fulfillmentOrderId of foids.split(',')) {
          const fulfillmentResponse = await callAdminGraphql(context.shop, `mutation FulfillmentCreate($fulfillment: FulfillmentInput!, $message: String) {
            fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
              fulfillment {
                id
                name
              }
              userErrors {
                field
                message
              }
            }
          }`, {
            fulfillment: {
              lineItemsByFulfillmentOrder: [
                {
                  fulfillmentOrderId,
                },
              ],
              trackingInfo: {
                company: 'Dummy shipping carrier',
                number: `manual-${Date.now()}`,
                url: 'https://example.com',
              },
            },
            message: 'Fulfilled by the barebone app sample.',
          });
          const userErrors = fulfillmentResponse.data.fulfillmentCreate.userErrors;
          if (userErrors.length > 0) error += userErrors.map((e) => e.message).join(',');
        }
      }

      const transactions = url.searchParams.get('trans');
      if (transactions) {
        for (const transaction of transactions.split(',')) {
          const [parentTransactionId, amount] = transaction.split('-');
          const captureResponse = await callAdminGraphql(context.shop, `mutation OrderCapture($input: OrderCaptureInput!) {
            orderCapture(input: $input) {
              transaction {
                id
                status
                gateway
                kind
              }
              userErrors {
                field
                message
              }
            }
          }`, {
            input: {
              amount,
              id: orderId,
              parentTransactionId,
            },
          });
          const userErrors = captureResponse.data.orderCapture.userErrors;
          if (userErrors.length > 0) error += userErrors.map((e) => e.message).join(',');
        }
      }

      response = await callAdminGraphql(context.shop, `query OrderDetails($id: ID!) {
        order(id: $id) {
          id
          name
          displayFulfillmentStatus
          fulfillable
          displayFinancialStatus
          capturable
          fulfillments(first: 10) {
            id
            createdAt
            deliveredAt
            displayStatus
            status
            trackingInfo {
              number
              company
            }
          }
          transactions(first: 10) {
            id
            status
            gateway
            formattedGateway
            kind
            manuallyCapturable
            amountSet {
              presentmentMoney {
                amount
                currencyCode
              }
            }
            parentTransaction {
              id
            }
          }
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                createdAt
                status
                requestStatus
                supportedActions {
                  action
                  externalUrl
                }
              }
            }
          }
        }
      }`, { id: orderId });
    }

    if (url.searchParams.get('fs') === 'true') {
      const origin = getPublicOrigin(request);
      response = await callAdminGraphql(context.shop, `query BareboneFulfillmentServiceOwner {
        shop {
          id
          metafield(namespace: "barebone_app", key: "fullfillment_service") {
            value
          }
        }
      }`);
      const shopId = response.data.shop.id;
      const existingServiceId = response.data.shop.metafield?.value;
      if (existingServiceId) {
        const deleteResponse = await callAdminGraphql(context.shop, `mutation FulfillmentServiceDelete($id: ID!) {
          fulfillmentServiceDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }`, { id: existingServiceId });
        const userErrors = deleteResponse.data.fulfillmentServiceDelete.userErrors;
        if (userErrors.length > 0) error += userErrors.map((e) => e.message).join(',');
      }

      response = await callAdminGraphql(context.shop, `mutation FulfillmentServiceCreate($callbackUrl: URL!, $inventoryManagement: Boolean!, $trackingSupport: Boolean!, $name: String!) {
        fulfillmentServiceCreate(callbackUrl: $callbackUrl, inventoryManagement: $inventoryManagement, trackingSupport: $trackingSupport, name: $name) {
          fulfillmentService {
            id
            serviceName
            callbackUrl
            inventoryManagement
            location {
              id
            }
            type
          }
          userErrors {
            field
            message
          }
        }
      }`, {
        callbackUrl: origin,
        inventoryManagement: true,
        trackingSupport: true,
        name: 'Barebone app fulfillment service',
      });
      const userErrors = response.data.fulfillmentServiceCreate.userErrors;
      if (userErrors.length > 0) {
        error += userErrors.map((e) => e.message).join(',');
      } else {
        await callAdminGraphql(context.shop, `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }`, {
          metafields: [
            {
              key: 'fullfillment_service',
              namespace: 'barebone_app',
              ownerId: shopId,
              value: response.data.fulfillmentServiceCreate.fulfillmentService.id,
              type: 'single_line_text_field',
            },
          ],
        });
      }
    }

    const delta = url.searchParams.get('delta');
    const name = url.searchParams.get('name');
    const reason = url.searchParams.get('reason');
    if (delta != null && name != null && reason != null) {
      response = await callAdminGraphql(context.shop, `query BareboneFulfillmentService {
        shop {
          id
          metafield(namespace: "barebone_app", key: "fullfillment_service") {
            value
          }
        }
      }`);
      const fulfillmentServiceId = response.data.shop.metafield?.value;
      if (!fulfillmentServiceId) {
        error += "This app's fulfillment service is not found!";
      } else {
        response = await callAdminGraphql(context.shop, `query FulfillmentServiceInventory($id: ID!) {
          fulfillmentService(id: $id) {
            id
            serviceName
            location {
              id
              inventoryLevels(first: 10) {
                edges {
                  node {
                    id
                    item {
                      id
                      variant {
                        id
                        title
                        product {
                          id
                          title
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`, { id: fulfillmentServiceId });
        const location = response.data.fulfillmentService.location;
        if (location.inventoryLevels.edges.length === 0) {
          error += "This app's fulfillment service has no inventory levels.";
        } else {
          for (const edge of location.inventoryLevels.edges) {
            const adjustResponse = await callAdminGraphql(context.shop, `mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!, $idempotencyKey: String!) {
              inventoryAdjustQuantities(input: $input) @idempotent(key: $idempotencyKey) {
                inventoryAdjustmentGroup {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }`, {
              input: {
                changes: [
                  {
                    delta: parseInt(delta, 10),
                    inventoryItemId: edge.node.item.id,
                    locationId: location.id,
                    ledgerDocumentUri: url.searchParams.get('uri') || null,
                    changeFromQuantity: null,
                  },
                ],
                name,
                reason,
              },
              idempotencyKey: uuidv4(),
            });
            const userErrors = adjustResponse.data.inventoryAdjustQuantities.userErrors;
            if (userErrors.length > 0) error += userErrors.map((e) => e.message).join(',');
          }
        }
      }
    }

    return json({
      response: response.data,
      error,
    });
  });
}

export async function loadBulkOperation(request) {
  return authenticatedEndpoint(request, async (context) => {
    const url = new URL(request.url);
    let response;
    const key = url.searchParams.get('key');
    if (key) {
      response = await callAdminGraphql(context.shop, `mutation BulkOperationRunMutation {
        bulkOperationRunMutation(
          mutation: "mutation call($input: ProductInput!) { productCreate(input: $input) { product { id title variants(first: 10) { edges { node { id title inventoryQuantity } } } } userErrors { message field } } }",
          stagedUploadPath: "${key}") {
          bulkOperation {
            id
            url
            status
          }
          userErrors {
            message
            field
          }
        }
      }`);
      return json(response);
    }

    if (url.searchParams.get('check') === 'true') {
      response = await callAdminGraphql(context.shop, `query CurrentBulkOperation {
        currentBulkOperation(type: MUTATION) {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
          partialDataUrl
        }
      }`);
      return json(response);
    }

    const id = url.searchParams.get('id');
    if (id) {
      response = await callAdminGraphql(context.shop, `mutation BulkOperationCancel {
        bulkOperationCancel(id: "${id}") {
          bulkOperation {
            status
          }
          userErrors {
            field
            message
          }
        }
      }`);
      return json(response);
    }

    response = await callAdminGraphql(context.shop, `mutation StagedUploadsCreate {
      stagedUploadsCreate(input: {
        resource: BULK_MUTATION_VARIABLES,
        filename: "bulk_op_vars",
        mimeType: "text/jsonl",
        httpMethod: POST
      }) {
        userErrors {
          field
          message
        }
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
      }
    }`);
    return json(response);
  });
}
