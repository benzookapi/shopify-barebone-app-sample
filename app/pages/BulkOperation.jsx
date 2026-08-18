import { useState, useEffect } from 'react';
import { authenticatedJson } from "../utils/app-bridge";
import { getAdminFromShop, getShopFromLocation } from "../utils/shop";
import sampleJsonl from '../assets/sample.jsonl?raw';
import sampleVariantsJsonl from '../assets/sample-variants.jsonl?raw';

const PRODUCT_CREATE = 'productCreate';
const PRODUCT_VARIANTS_BULK_CREATE = 'productVariantsBulkCreate';

// Bulk opearation sample for product impporting with a file uploader.
// Read https://shopify.dev/docs/api/usage/bulk-operations/imports
function BulkOperation() {

    const shop = getShopFromLocation();

    const [id, setId] = useState('');
    const [url, setUrl] = useState('');
    const [pUrl, setPUrl] = useState('');

    const [result, setResult] = useState('');
    const [accessing, setAccessing] = useState(false);

    const [key, setKey] = useState('');
    const [operationType, setOperationType] = useState('');

    const [res, setRes] = useState('');

    const showStatus = () => {
        setRes(``);
        setId(``);
        setUrl(``);
        setPUrl(``);
        authenticatedJson(`/bulkoperation.json?check=true`).then((json) => {
            console.log(JSON.stringify(json, null, 4));
            setRes(JSON.stringify(json, null, 4));
            const operation = json.data.currentBulkOperation;
            setId(operation?.id || '');
            setUrl(operation?.url || '');
            setPUrl(operation?.partialDataUrl || '');
        }).catch((e) => {
            console.log(`${e}`);
            setRes(`${e}`);
            setId(``);
            setUrl(``);
            setPUrl(``);
        });
    };

    useEffect(() => {
        showStatus();
    }, ['']);

    return (
        <s-page heading="Bulk operation sample for product importing with a file uploader">
            <s-stack direction="block" gap="large">
                <s-section>
                    <s-link href="https://shopify.dev/docs/api/usage/bulk-operations/imports" target="_blank">Dev. doc</s-link>
                    <br /><br />
                    <s-ordered-list>
                        <s-list-item>
                            <FileUploader onUploaded={(upload) => {
                                setKey(upload.key);
                                setOperationType(upload.operationType);
                                setResult('');
                            }}></FileUploader>
                            <p>&nbsp;</p>
                        </s-list-item>
                        <s-list-item>
                            <p>
                                Run the uploaded <s-badge>{operationType || 'operation type'}</s-badge> bulk operation with the key: <s-badge>{key || 'Upload required'}</s-badge>.
                            </p>
                            <p>&nbsp;</p>
                            <s-button variant="primary" disabled={!key || accessing} onClick={() => {
                                setAccessing(true);
                                setId('');
                                setUrl('');
                                setPUrl('');
                                setRes('');
                                authenticatedJson(`/bulkoperation.json?key=${encodeURIComponent(key)}&operationType=${encodeURIComponent(operationType)}`).then((json) => {
                                    console.log(JSON.stringify(json, null, 4));
                                    setAccessing(false);
                                    if (json.data.bulkOperationRunMutation.userErrors.length == 0) {
                                        setResult('Success!');
                                    } else {
                                        setResult(`Error! ${JSON.stringify(json.data.bulkOperationRunMutation.userErrors[0].message)}`);
                                    }
                                }).catch((e) => {
                                    console.log(`${e}`);
                                    setAccessing(false);
                                    setResult('Error!');
                                });
                            }}>
                                Run the operation
                            </s-button>&nbsp;
                            <s-badge tone='info'>Result: <APIResult2 res={result} loading={accessing} /></s-badge>
                            <p>&nbsp;</p>
                        </s-list-item>
                        <s-list-item>
                            <p>
                                After the operation started, you can check the latest status with <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/objects/queryroot#field-QueryRoot.fields.bulkOperation" target="_blank">
                                    bulkOperation query</s-link> and seeing <s-link href={`https://${ getAdminFromShop(shop)}/products`} target="_blank">Products</s-link>.
                            </p>
                            <p>&nbsp;</p>
                            <s-button variant="primary" onClick={() => {
                                showStatus();
                            }}>
                                Check the latest status
                            </s-button>
                            <p>&nbsp;</p>
                            <p>
                                <b>The last operation:</b>
                                &nbsp; {url ? <s-link href={url} target="_blank">Result data</s-link> : ''}
                                &nbsp; {pUrl ? <s-link href={pUrl} target="_blank">Partial data</s-link> : ''}
                            </p>
                            <APIResult res={res} />
                            <p>&nbsp;</p>
                            <s-button variant="primary" disabled={!id} onClick={() => {
                                setRes(``);
                                authenticatedJson(`/bulkoperation.json?id=${encodeURIComponent(id)}`).then((json) => {
                                    console.log(JSON.stringify(json, null, 4));
                                }).catch((e) => {
                                    console.log(`${e}`);
                                });
                                showStatus();
                            }}>
                                Cancel the current operation
                            </s-button>
                            <p>&nbsp;</p>
                        </s-list-item>
                    </s-ordered-list>
                </s-section>
                <s-section>
                    <s-unordered-list>
                        <s-list-item>
                            <p>
                                For <b>data export with queries</b>, you can test it out reading <s-link href={`https://shopify.dev/docs/api/usage/bulk-operations/queries`} target="_blank">the dev. doc</s-link> with <s-link href={`https://shopify.dev/docs/apps/tools/graphiql-admin-api`} target="_blank">Shopify Admin API GraphiQL Explorer</s-link>.
                            </p>
                        </s-list-item>
                    </s-unordered-list>
                </s-section>
            </s-stack>
        </s-page>
    );
}

function downloadSample(contents, filename) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/jsonl' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function FileUploader({ onUploaded }) {
    const [selectedOperation, setSelectedOperation] = useState(PRODUCT_CREATE);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [selectedResultFileName, setSelectedResultFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState('');

    const uploadFile = (event) => {
        event.preventDefault();
        setUploading(true);
        setUploadResult('');
        onUploaded({ key: '', operationType: '' });

        const formData = new FormData(event.currentTarget);
        formData.set('operationType', selectedOperation);
        authenticatedJson('/bulkoperation.json', {
            method: 'POST',
            body: formData,
        }).then((json) => {
            console.log(JSON.stringify(json, null, 4));
            setUploading(false);
            setUploadResult(`Uploaded ${json.recordCount} records for ${json.operationType}.`);
            onUploaded({ key: json.key, operationType: json.operationType });
        }).catch((error) => {
            console.log(`${error}`);
            setUploading(false);
            setUploadResult(`${error}`);
        });
    };

    return (
        <form method="post" encType="multipart/form-data" onSubmit={uploadFile}>
            <p>
                Upload a supported JSONL file to import products or variants.
            </p>
            <s-button-group gap="base" accessibilityLabel="Download sample JSONL files">
                <s-button slot="secondary-actions" variant="secondary" icon="download" type="button" onClick={() => downloadSample(sampleJsonl, 'sample.jsonl')}>Download sample.jsonl</s-button>
                <s-button slot="secondary-actions" variant="secondary" icon="download" type="button" onClick={() => downloadSample(sampleVariantsJsonl, 'sample-variants.jsonl')}>Download sample-variants.jsonl</s-button>
            </s-button-group>
            <br />
            <s-select
                label="JSONL operation"
                name="operationType"
                value={selectedOperation}
                onChange={(event) => {
                    setSelectedOperation(event.currentTarget.value);
                    setSelectedFileName('');
                    setSelectedResultFileName('');
                    setUploadResult('');
                    onUploaded({ key: '', operationType: '' });
                }}
            >
                <s-option value={PRODUCT_CREATE}>Create products</s-option>
                <s-option value={PRODUCT_VARIANTS_BULK_CREATE}>Create product variants</s-option>
            </s-select>
            <br />
            <br />
            <s-drop-zone
                key={selectedOperation}
                label={selectedOperation === PRODUCT_CREATE ? 'Product creation JSONL file' : 'Variant creation JSONL file'}
                name="file"
                accept=".jsonl"
                onChange={(event) => setSelectedFileName(event.currentTarget.files[0]?.name || '')}
            ></s-drop-zone>
            {selectedFileName && <s-paragraph>Selected file: {selectedFileName}</s-paragraph>}
            {selectedOperation === PRODUCT_CREATE ? (
                <p>
                    Product creation format: each line is a native GraphQL variables object containing <b>product</b> (<s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/input-objects/ProductCreateInput" target="_blank">ProductCreateInput</s-link>) and optional <b>media</b> (<s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/input-objects/CreateMediaInput" target="_blank">CreateMediaInput</s-link>). Put each public image URL in <b>media[].originalSource</b>. The bundled sample provides one ordered media entry for every variant in the same JSONL row. You can't preassign <b>product.id</b> or a media GID; Shopify generates and returns them after creation.
                </p>
            ) : (
                <>
                    <p>
                        Variant creation format: each line is a native <b>productVariantsBulkCreate</b> variables object with <b>productId</b> and one or more <b>variants</b> (<s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/input-objects/ProductVariantsBulkInput" target="_blank">ProductVariantsBulkInput</s-link>). Each variant supplies one value for every product option and can specify its existing product media with <b>mediaId</b>. The bundled sample makes both ID fields visible with <b>gid://shopify/Product/0</b> and <b>gid://shopify/MediaImage/0</b> placeholders.
                    </p>
                    <br />
                    <s-drop-zone
                        label="Product creation Result data JSONL file"
                        name="productResultFile"
                        accept=".jsonl"
                        onChange={(event) => setSelectedResultFileName(event.currentTarget.files[0]?.name || '')}
                    ></s-drop-zone>
                    {selectedResultFileName && <s-paragraph>Selected file: {selectedResultFileName}</s-paragraph>}
                    <p>
                        For the bundled sample, download the completed product creation operation's <b>Result data</b> in step 3 and upload it here. Before staging, this sample uses each result's <b>__lineNumber</b> to overwrite the same variant row's product and media placeholders with Shopify-generated GIDs. This replacement is sample preprocessing, not <b>productVariantsBulkCreate</b> behavior. A custom file that already contains real <b>productId</b> and <b>mediaId</b> values doesn't require the Result data file.
                    </p>
                </>
            )}
            <p>
                You can convert JSON to JSONL with tools such as <s-link href="https://tableconvert.com/json-to-jsonlines" target="_blank">this converter</s-link>.
            </p>
            <br />
            <s-button variant="primary" type="submit" loading={uploading} disabled={uploading}>Upload</s-button>
            &nbsp;<s-badge tone="info">Result: {uploadResult}</s-badge>
        </form>
    );
}

function APIResult(props) {
    if (Object.keys(props.res).length === 0) {
        return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
    }
    return (<pre>{props.res}</pre>);
}

function APIResult2(props) {
    if (props.loading) {
        return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
    }
    return (<span>{props.res}</span>);
}

export default BulkOperation
