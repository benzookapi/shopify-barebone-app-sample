import { authenticatedEndpoint } from './embedded.server.js';
import { json } from './http.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

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
