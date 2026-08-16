import { authenticatedEndpoint } from './embedded.server.js';
import { json } from './http.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

const MAX_VARIANTS_PER_PRODUCT = 3;

function parseImageUrls(value) {
  const urls = `${value || ''}`
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error('Enter at least one publicly accessible product image URL.');
  }

  for (const url of urls) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid product image URL: ${url}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Product image URL must use HTTP or HTTPS: ${url}`);
    }
  }

  return urls;
}

function enrichProductJsonl(source, imageUrls) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('The selected JSONL file is empty.');
  }

  return lines.map((line, index) => {
    let variables;
    try {
      variables = JSON.parse(line);
    } catch {
      throw new Error(`Line ${index + 1} is not valid JSON.`);
    }

    if (!variables.input || typeof variables.input !== 'object') {
      throw new Error(`Line ${index + 1} must contain an input object.`);
    }

    const variants = variables.input.variants;
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new Error(`Line ${index + 1} must contain at least one variant.`);
    }
    if (variants.length > MAX_VARIANTS_PER_PRODUCT) {
      throw new Error(`Line ${index + 1} contains more than ${MAX_VARIANTS_PER_PRODUCT} variants.`);
    }

    const imageUrl = imageUrls[index % imageUrls.length];
    variables.input.files = [{
      alt: `${variables.input.title || `Product ${index + 1}`} image`,
      contentType: 'IMAGE',
      originalSource: imageUrl,
    }];

    return JSON.stringify(variables);
  }).join('\n');
}

async function createStagedUpload(shop) {
  return callAdminGraphql(shop, `mutation StagedUploadsCreate {
    stagedUploadsCreate(input: {
      resource: BULK_MUTATION_VARIABLES,
      filename: "sample.jsonl",
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
}

export async function uploadBulkOperation(request) {
  return authenticatedEndpoint(request, async (context) => {
    try {
      const submitted = await request.formData();
      const file = submitted.get('file');
      if (!file || typeof file.text !== 'function') {
        return json({ error: 'Select a JSONL file to upload.' }, { status: 400 });
      }

      const imageUrls = parseImageUrls(submitted.get('imageUrls'));
      const jsonl = enrichProductJsonl(await file.text(), imageUrls);
      const stagedUpload = await createStagedUpload(context.shop);
      const errors = stagedUpload.data?.stagedUploadsCreate?.userErrors || [];
      const target = stagedUpload.data?.stagedUploadsCreate?.stagedTargets?.[0];

      if (errors.length > 0 || !target) {
        return json({
          error: errors[0]?.message || 'Shopify did not return a staged upload target.',
        }, { status: 400 });
      }

      const key = target.parameters.find((parameter) => parameter.name === 'key')?.value;
      if (!key) {
        return json({ error: 'Shopify did not return a staged upload key.' }, { status: 400 });
      }

      const upload = new FormData();
      for (const parameter of target.parameters) {
        upload.append(parameter.name, parameter.value);
      }
      upload.append('file', new Blob([jsonl], { type: 'text/jsonl' }), 'sample.jsonl');

      const response = await fetch(target.url, {
        method: 'POST',
        body: upload,
      });
      if (!response.ok) {
        return json({
          error: `Staged upload failed with HTTP ${response.status}.`,
        }, { status: 502 });
      }

      return json({ key, productCount: jsonl.split('\n').length });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : `${error}` }, { status: 400 });
    }
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
          mutation: "mutation call($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { id title variants(first: 3) { nodes { id title inventoryQuantity } } } userErrors { message field } } }",
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

    response = await createStagedUpload(context.shop);
    return json(response);
  });
}
