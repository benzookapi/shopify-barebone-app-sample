import { authenticatedEndpoint } from './embedded.server.js';
import { json } from './http.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

const MAX_VARIANTS_PER_PRODUCT = 3;
const PRODUCT_CREATE = 'productCreate';
const PRODUCT_VARIANTS_BULK_CREATE = 'productVariantsBulkCreate';

const BULK_MUTATIONS = {
  [PRODUCT_CREATE]: `mutation call($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }`,
  [PRODUCT_VARIANTS_BULK_CREATE]: `mutation call(
    $productId: ID!,
    $variants: [ProductVariantsBulkInput!]!,
    $strategy: ProductVariantsBulkCreateStrategy,
    $media: [CreateMediaInput!]
  ) {
    productVariantsBulkCreate(
      productId: $productId,
      variants: $variants,
      strategy: $strategy,
      media: $media
    ) {
      productVariants {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }`,
};

const RUN_BULK_MUTATION = `mutation BulkOperationRunMutation(
  $mutation: String!,
  $stagedUploadPath: String!
) {
  bulkOperationRunMutation(
    mutation: $mutation,
    stagedUploadPath: $stagedUploadPath
  ) {
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
}`;

function parseJsonl(source, label = 'The selected JSONL file') {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`${label} is empty.`);
  }

  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`${label} line ${index + 1} is not valid JSON.`);
    }
  });
}

function prepareProductCreateJsonl(records) {
  return records.map((variables, index) => {
    if (!variables.product || typeof variables.product !== 'object') {
      throw new Error(`Line ${index + 1} must contain a product object.`);
    }
    if (variables.media != null && !Array.isArray(variables.media)) {
      throw new Error(`Line ${index + 1} media must be an array.`);
    }
    return JSON.stringify(variables);
  }).join('\n');
}

function productIdsFromCreateResults(records) {
  const productIdsByHandle = new Map();

  records.forEach((result, index) => {
    const product = result?.data?.productCreate?.product;
    if (!product?.id || !product?.handle) return;

    const existingId = productIdsByHandle.get(product.handle);
    if (existingId && existingId !== product.id) {
      throw new Error(`Product creation result line ${index + 1} contains a duplicate handle with a different product ID: "${product.handle}".`);
    }
    productIdsByHandle.set(product.handle, product.id);
  });

  if (productIdsByHandle.size === 0) {
    throw new Error('The product creation result JSONL does not contain any successful productCreate results with product IDs and handles.');
  }

  return productIdsByHandle;
}

function prepareVariantCreateJsonl(records, productCreateResults) {
  const requiresResultData = records.some((variables) => !variables.productId && variables.productHandle);
  const productIdsByHandle = requiresResultData
    ? productIdsFromCreateResults(productCreateResults)
    : new Map();

  return records.map((variables, index) => {
    const productHandle = `${variables.productHandle || ''}`.trim();
    const productId = variables.productId || productIdsByHandle.get(productHandle);
    if (!productId) {
      if (productHandle) {
        throw new Error(`No successful productCreate result was found for productHandle "${productHandle}" on variant line ${index + 1}.`);
      }
      throw new Error(`Variant line ${index + 1} must contain productId or productHandle.`);
    }

    if (!Array.isArray(variables.variants) || variables.variants.length === 0) {
      throw new Error(`Line ${index + 1} must contain at least one variant.`);
    }
    if (variables.variants.length > MAX_VARIANTS_PER_PRODUCT) {
      throw new Error(`Line ${index + 1} contains more than ${MAX_VARIANTS_PER_PRODUCT} variants.`);
    }
    if (variables.media != null && !Array.isArray(variables.media)) {
      throw new Error(`Line ${index + 1} media must be an array.`);
    }

    const normalized = {
      productId,
      variants: variables.variants,
      strategy: variables.strategy || 'REMOVE_STANDALONE_VARIANT',
    };
    if (variables.media) normalized.media = variables.media;
    return JSON.stringify(normalized);
  }).join('\n');
}

function prepareJsonl(source, operationType, productResultSource = '') {
  const records = parseJsonl(source);
  if (operationType === PRODUCT_CREATE) {
    return {
      jsonl: prepareProductCreateJsonl(records),
      recordCount: records.length,
    };
  }
  if (operationType === PRODUCT_VARIANTS_BULK_CREATE) {
    const requiresResultData = records.some((variables) => !variables.productId && variables.productHandle);
    if (requiresResultData && !productResultSource.trim()) {
      throw new Error('Select the product creation Result data JSONL when variant records use productHandle.');
    }
    const productCreateResults = requiresResultData
      ? parseJsonl(productResultSource, 'The product creation result JSONL')
      : [];
    return {
      jsonl: prepareVariantCreateJsonl(records, productCreateResults),
      recordCount: records.length,
    };
  }
  throw new Error(`Unsupported operation type: ${operationType || '(empty)'}`);
}

async function createStagedUpload(shop, filename) {
  return callAdminGraphql(shop, `mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
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
  }`, {
    input: [{
      resource: 'BULK_MUTATION_VARIABLES',
      filename,
      mimeType: 'text/jsonl',
      httpMethod: 'POST',
    }],
  });
}

export async function uploadBulkOperation(request) {
  return authenticatedEndpoint(request, async (context) => {
    try {
      const submitted = await request.formData();
      const file = submitted.get('file');
      if (!file || typeof file.text !== 'function') {
        return json({ error: 'Select a JSONL file to upload.' }, { status: 400 });
      }

      const operationType = `${submitted.get('operationType') || ''}`;
      const productResultFile = submitted.get('productResultFile');
      const productResultSource = productResultFile && typeof productResultFile.text === 'function'
        ? await productResultFile.text()
        : '';
      const prepared = prepareJsonl(await file.text(), operationType, productResultSource);
      const filename = operationType === PRODUCT_CREATE
        ? 'sample.jsonl'
        : 'sample-variants.jsonl';
      const stagedUpload = await createStagedUpload(context.shop, filename);
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
      upload.append('file', new Blob([prepared.jsonl], { type: 'text/jsonl' }), filename);

      const response = await fetch(target.url, {
        method: 'POST',
        body: upload,
      });
      if (!response.ok) {
        return json({
          error: `Staged upload failed with HTTP ${response.status}.`,
        }, { status: 502 });
      }

      return json({
        key,
        operationType,
        recordCount: prepared.recordCount,
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : `${error}` }, { status: 400 });
    }
  });
}

export async function loadBulkOperation(request) {
  return authenticatedEndpoint(request, async (context) => {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key) {
      const operationType = url.searchParams.get('operationType');
      const mutation = BULK_MUTATIONS[operationType];
      if (!mutation) {
        return json({ error: 'Missing or unsupported operation type.' }, { status: 400 });
      }
      const response = await callAdminGraphql(context.shop, RUN_BULK_MUTATION, {
        mutation,
        stagedUploadPath: key,
      });
      return json(response);
    }

    if (url.searchParams.get('check') === 'true') {
      const response = await callAdminGraphql(context.shop, `query CurrentBulkOperation {
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
      const response = await callAdminGraphql(context.shop, `mutation BulkOperationCancel($id: ID!) {
        bulkOperationCancel(id: $id) {
          bulkOperation {
            status
          }
          userErrors {
            field
            message
          }
        }
      }`, { id });
      return json(response);
    }

    return json({ error: 'Missing bulk operation action.' }, { status: 400 });
  });
}
