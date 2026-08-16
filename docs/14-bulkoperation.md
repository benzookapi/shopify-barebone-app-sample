# Bulk Operation

## Purpose

The `/bulkoperation` sample imports products, product images, and up to three variants per product from JSON Lines files. It demonstrates two dependent Admin GraphQL bulk mutations: `productCreate` creates products with options and media, then `productVariantsBulkCreate` replaces each initial variant with the variants from a second file. It also demonstrates status polling, result URLs, partial-data URLs, and cancellation.

## Runtime Locations

- The embedded browser submits a JSONL file and the selected operation type to the authenticated app endpoint. A handle-based variant import also submits the Result data JSONL downloaded from the completed product creation operation.
- The app server validates product creation records. For variant records, it matches each `productHandle` to the product ID returned in the product creation Result data before creating the staged file.
- The app server uploads the prepared file to Shopify's staged storage and starts, polls, or cancels the selected bulk operation through Admin GraphQL.
- Shopify processes the JSONL file asynchronously.

## Import Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant UI as /bulkoperation page
    participant App as /bulkoperation.json
    participant API as Admin GraphQL API
    participant Storage as Shopify staged upload storage
    participant Worker as Shopify bulk operation

    Merchant->>UI: Select productCreate and sample.jsonl
    UI->>App: Upload product creation JSONL
    App->>App: Validate product and media variables
    App->>API: stagedUploadsCreate
    API-->>App: URL, key, and form parameters
    App->>Storage: Multipart upload with supplied parameters
    Storage-->>App: Upload response
    App-->>UI: Product staged upload key
    Merchant->>UI: Run product creation
    UI->>App: Send key and productCreate type
    App->>API: bulkOperationRunMutation with productCreate
    API->>Worker: Queue asynchronous processing
    API-->>UI: Bulk operation ID and status
    loop Until product creation completes
        UI->>App: Check current mutation operation
        App->>API: currentBulkOperation
        API-->>UI: Status, counts, errors, result URLs
    end
    Merchant->>UI: Download product creation Result data JSONL
    Merchant->>UI: Select productVariantsBulkCreate and sample-variants.jsonl
    UI->>App: Upload variant JSONL and product Result data
    App->>App: Read successful productCreate results
    App->>App: Match productHandle to returned product.id
    App->>API: stagedUploadsCreate
    App->>Storage: Upload normalized variant JSONL
    Merchant->>UI: Run variant creation
    UI->>App: Send key and productVariantsBulkCreate type
    App->>API: bulkOperationRunMutation with productVariantsBulkCreate
    API->>Worker: Queue asynchronous processing
    API-->>UI: Bulk operation ID and status
    loop Until variant creation completes
        UI->>App: Check current mutation operation
        App->>API: currentBulkOperation
        API-->>UI: Status, counts, errors, result URLs
    end
```

## How It Works

The sample downloads are generated with `.jsonl` filenames so that they remain selectable by the uploader's file filter.

### Product creation format

Select **Create products** and upload `sample.jsonl`. Each line is the variables object for `productCreate`:

```json
{"product":{"title":"Example","handle":"example","productOptions":[{"name":"Size","values":[{"name":"Small"},{"name":"Medium"},{"name":"Large"}]}]},"media":[{"mediaContentType":"IMAGE","originalSource":"https://cdn.example.com/image.png"}]}
```

`product` uses `ProductCreateInput`. Optional `media` entries use `CreateMediaInput`, so public image URLs belong in the JSONL file rather than in a separate UI field. The bundled sample contains ten products and reuses five image URLs twice.

### Variant creation format

After product creation completes, download its **Result data**, select **Create product variants**, and upload both `sample-variants.jsonl` and the downloaded Result data JSONL. Each variant line contains one to three `ProductVariantsBulkInput` records and identifies the product by `productId` or `productHandle`:

```json
{"productHandle":"example","strategy":"REMOVE_STANDALONE_VARIANT","variants":[{"optionValues":[{"optionName":"Size","name":"Small"}],"price":"10.00","inventoryItem":{"sku":"EXAMPLE-S"}}]}
```

`productId` is the native `productVariantsBulkCreate` variable. `productHandle` is a sample convenience field: the app server finds the matching `product.handle` in the uploaded product creation Result data and writes its returned `product.id` to the staged variant JSONL. This avoids one synchronous Admin GraphQL lookup per product. A custom variant file that already contains native `productId` values doesn't require the Result data file. `REMOVE_STANDALONE_VARIANT` removes the single initial variant created by `productCreate` before the new variants are added.

### Product creation Result data

The mutation selection used by this sample returns `product.id`, `product.handle`, and `product.title`. Shopify writes one response object for every input JSONL line. Each output object also includes `__lineNumber`, which identifies the corresponding zero-based line in the original product creation input. For example:

```json
{"data":{"productCreate":{"product":{"id":"gid://shopify/Product/1234567890","handle":"example","title":"Example"},"userErrors":[]}},"__lineNumber":0}
```

The sample matches handles because both bundled files contain the same stable handles. Production import pipelines can retain the original input chunk and use `__lineNumber` as the authoritative correlation key, including when a line fails and has no returned product.

Product and variant creation cannot use one native Shopify JSONL file or one bulk mutation. `productVariantsBulkCreate` requires a product ID that does not exist until `productCreate` has completed, so the two operations must run sequentially.

Starting `bulkOperationRunMutation` only queues work. The UI must query `currentBulkOperation(type: MUTATION)` until Shopify reports a terminal state. Completed operations can expose a result file; failed or partially successful operations can expose partial data. Cancellation is also asynchronous and should be followed by another status query.

## Production-scale imports

The in-request parsing in this sample is intended for demonstration-sized files. For hundreds of thousands or millions of products, use a durable import pipeline:

- Split input into chunks comfortably below Shopify's 100 MB JSONL limit and the 24-hour bulk-operation execution limit.
- Store each input chunk, operation ID, stage, and retry state in durable storage instead of browser or server memory.
- Stream input and Result data files rather than loading complete files into memory.
- Detect completion with ID-specific status polling or the `bulk_operations/finish` webhook, then download and retain the temporary Result data before its URL expires.
- Build each variant chunk from the corresponding product creation Result data, using `__lineNumber` or another stable source key to correlate records.
- Retry only failed result lines and make retries idempotent so a restarted worker doesn't create duplicate products or variants.
- Schedule within the API-version concurrency limit. API version 2026-01 and later allows up to five concurrent bulk mutation operations per app and shop.

## Common Pitfalls

- Upload success and bulk-operation success are separate events.
- JSONL requires one valid JSON object per line, not a JSON array and not a multiline object.
- Match the selected operation type to the uploaded file format.
- Complete the product operation and download its Result data before uploading a handle-based variant file; missing or failed product results are rejected before staging.
- Use Result data whose `data` object contains `productCreate`. Result data containing `productVariantsBulkCreate` comes from the second operation and can't resolve product handles to product IDs.
- Variant records can use a native `productId` instead of the sample-specific `productHandle` field, in which case no product creation Result data is required.
- The sample limits each `productVariantsBulkCreate` record to three variants.
- Product image URLs must be reachable by Shopify over HTTP or HTTPS; local filesystem and `localhost` URLs cannot be imported.
- The bundled product handles are fixed. Delete previously imported sample products before running the same product creation sample again, or change the handles in both files.
- The staged upload key from the returned parameters is the path passed to the bulk mutation.
- Bulk operations return top-level user errors immediately and per-record errors in output data; inspect both.
- Poll with backoff instead of a tight loop.
- Staged targets and result URLs are temporary.
- Shopify limits concurrent bulk operations by type and API rules; check current limits before production scheduling.

## Key Terms

| Term | Meaning |
| --- | --- |
| JSONL | JSON Lines format containing one independent JSON value per line |
| Staged upload | Temporary Shopify-managed storage used as bulk mutation input |
| Mutation template | GraphQL mutation applied once for each JSONL variables object |
| `productCreate` | First-stage mutation that creates each product, its options, initial variant, and media |
| `productVariantsBulkCreate` | Second-stage mutation that creates multiple variants for an existing product |
| `productHandle` | Sample convenience field matched to the product ID in product creation Result data before the variant file is staged |
| `__lineNumber` | Zero-based input line number included in each bulk mutation Result data record for correlation and error handling |
| Bulk operation | Asynchronous Shopify job processing a large set of API records |
| Partial data URL | Output generated before or alongside a failed or incomplete operation |

## Source Map

- [`app/pages/BulkOperation.jsx`](../app/pages/BulkOperation.jsx): file upload, start, poll, and cancel UI
- [`app/routes/bulkoperation-json.jsx`](../app/routes/bulkoperation-json.jsx): authenticated route
- [`app/lib/bulk-operation.server.js`](../app/lib/bulk-operation.server.js): staged upload and bulk GraphQL operations
- [`app/assets/sample.jsonl`](../app/assets/sample.jsonl): product creation input with media URLs
- [`app/assets/sample-variants.jsonl`](../app/assets/sample-variants.jsonl): variant creation input using product handles

## Official Shopify References

- [Import data with bulk operations](https://shopify.dev/docs/api/usage/bulk-operations/imports)
- [Bulk operation overview](https://shopify.dev/docs/api/usage/bulk-operations)
- [Run a bulk mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/bulkOperationRunMutation)
- [Create a product with `productCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate)
- [Create product variants with `productVariantsBulkCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkCreate)
- [`ProductVariantsBulkCreateStrategy`](https://shopify.dev/docs/api/admin-graphql/latest/enums/ProductVariantsBulkCreateStrategy)
- [Create staged upload targets](https://shopify.dev/docs/api/admin-graphql/latest/mutations/stagedUploadsCreate)
- [Query current bulk operation](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentBulkOperation)
