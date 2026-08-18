import { authenticatedEndpoint } from './embedded.server.js';
import { json } from './http.server.js';
import { callAdminGraphql } from './shopify-graphql.server.js';

const PRODUCT_CREATE = 'productCreate';
const PRODUCT_VARIANTS_BULK_CREATE = 'productVariantsBulkCreate';
const PRODUCT_ID_PLACEHOLDER = 'gid://shopify/Product/0';
const MEDIA_ID_PLACEHOLDER = 'gid://shopify/MediaImage/0';

const BULK_MUTATIONS = {
  [PRODUCT_CREATE]: `mutation call($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        title
        media(first: 250, sortKey: POSITION) {
          nodes {
            id
          }
        }
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

function productDataFromCreateResults(records) {
  const productsByLineNumber = new Map();

  records.forEach((result, index) => {
    const lineNumber = result?.__lineNumber;
    if (!Number.isInteger(lineNumber) || lineNumber < 0) {
      throw new Error(`The selected Result data line ${index + 1} does not contain a valid __lineNumber.`);
    }
    if (productsByLineNumber.has(lineNumber)) {
      throw new Error(`The selected Result data contains duplicate __lineNumber ${lineNumber}.`);
    }

    const resultOperations = result?.data && typeof result.data === 'object'
      ? Object.keys(result.data)
      : [];
    const unexpectedOperation = resultOperations.find((operation) => operation !== PRODUCT_CREATE);
    if (unexpectedOperation) {
      throw new Error(`The selected Result data line ${index + 1} is from ${unexpectedOperation}, not productCreate. Upload the Result data from the completed product creation operation.`);
    }

    const mutationResult = result?.data?.productCreate;
    const product = mutationResult?.product;
    const userErrors = mutationResult?.userErrors || [];
    productsByLineNumber.set(lineNumber, {
      id: product?.id || '',
      mediaIds: (product?.media?.nodes || []).map((media) => media?.id).filter(Boolean),
      error: userErrors.map((error) => error?.message).filter(Boolean).join('; '),
    });
  });

  return productsByLineNumber;
}

function requiresProductCreateResults(variables) {
  return variables?.productId === PRODUCT_ID_PLACEHOLDER
    || (Array.isArray(variables?.variants)
      && variables.variants.some((variant) => variant?.mediaId === MEDIA_ID_PLACEHOLDER));
}

function prepareVariantCreateJsonl(records, productCreateResults) {
  const requiresResultData = records.some(requiresProductCreateResults);
  const productsByLineNumber = requiresResultData
    ? productDataFromCreateResults(productCreateResults)
    : new Map();

  return records.map((variables, index) => {
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
      throw new Error(`Line ${index + 1} must contain a GraphQL variables object.`);
    }
    if (typeof variables.productId !== 'string' || !variables.productId.trim()) {
      throw new Error(`Variant line ${index + 1} must contain the native productId variable.`);
    }
    if (!Array.isArray(variables.variants) || variables.variants.length === 0) {
      throw new Error(`Line ${index + 1} must contain at least one variant.`);
    }
    if (variables.media != null && !Array.isArray(variables.media)) {
      throw new Error(`Line ${index + 1} media must be an array.`);
    }

    const needsResultData = requiresProductCreateResults(variables);
    const resultProduct = needsResultData ? productsByLineNumber.get(index) : null;
    if (needsResultData && !resultProduct?.id) {
      const detail = resultProduct?.error ? `: ${resultProduct.error}` : '';
      throw new Error(`Product creation Result data does not contain a successful productCreate result for __lineNumber ${index}${detail}`);
    }

    const productId = variables.productId === PRODUCT_ID_PLACEHOLDER
      ? resultProduct.id
      : variables.productId;
    if (resultProduct && variables.productId !== PRODUCT_ID_PLACEHOLDER && variables.productId !== resultProduct.id) {
      throw new Error(`Variant line ${index + 1} productId does not match the productCreate result for __lineNumber ${index}.`);
    }

    const variants = variables.variants.map((variant, variantIndex) => {
      if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
        throw new Error(`Line ${index + 1} variant ${variantIndex + 1} must be an object.`);
      }
      if (variant.mediaId !== MEDIA_ID_PLACEHOLDER) return variant;

      const mediaId = resultProduct?.mediaIds[variantIndex];
      if (!mediaId) {
        throw new Error(`Product creation Result data for __lineNumber ${index} does not contain media ${variantIndex + 1} required by variant line ${index + 1}.`);
      }
      return { ...variant, mediaId };
    });

    return JSON.stringify({ ...variables, productId, variants });
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
    const requiresResultData = records.some(requiresProductCreateResults);
    if (requiresResultData && !productResultSource.trim()) {
      throw new Error(`Select the product creation Result data JSONL to replace ${PRODUCT_ID_PLACEHOLDER} and ${MEDIA_ID_PLACEHOLDER} placeholders.`);
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
