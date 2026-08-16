import { useState, useEffect } from 'react';
import { authenticatedJson } from "../utils/app-bridge";
import { getAdminFromShop, getShopFromLocation } from "../utils/shop";
import sampleJsonl from '../assets/sample.jsonl?raw';

const DEFAULT_IMAGE_URLS = [
    'https://cdn.shopify.com/s/files/1/0064/0712/7062/files/9022a705161ff42b7879d88f1fd6d0e8_16f2e476-e91c-469f-b9d1-fe79e8021cb9.png?v=1783058998',
    'https://cdn.shopify.com/s/files/1/0064/0712/7062/files/inkjet-printer.png?v=1782975048',
    'https://cdn.shopify.com/s/files/1/0064/0712/7062/files/9022a705161ff42b7879d88f1fd6d0e8_dc62fc9a-3f8b-4f2a-81a0-ef45e6084ad8.png?v=1782955524',
    'https://cdn.shopify.com/s/files/1/0064/0712/7062/files/white-bowl-surrounded-by-herbs-chilis-and-lime-slices.jpg?v=1694338542',
    'https://cdn.shopify.com/s/files/1/0064/0712/7062/files/wood-wall-and-bamboo-bundle-reflection.jpg?v=1738053217',
].join(',\n');

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
                            <FileUploader onUploaded={setKey}></FileUploader>
                            <p>&nbsp;</p>
                        </s-list-item>
                        <s-list-item>
                            <p>
                                Run the bulk operation for product creations from the uploaded file above with the key: <s-badge>{key || 'Upload required'}</s-badge>.
                            </p>
                            <p>&nbsp;</p>
                            <s-button variant="primary" disabled={!key || accessing} onClick={() => {
                                setAccessing(true);
                                authenticatedJson(`/bulkoperation.json?key=${encodeURIComponent(key)}`).then((json) => {
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
                                &nbsp; {url != null ? <s-link href={url} target="_blank">Result data</s-link> : ''}
                                &nbsp; {pUrl != null ? <s-link href={pUrl} target="_blank">Partial data</s-link> : ''}
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

function downloadSample() {
    const url = URL.createObjectURL(new Blob([sampleJsonl], { type: 'text/jsonl' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample.jsonl';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function FileUploader({ onUploaded }) {
    const [imageUrls, setImageUrls] = useState(DEFAULT_IMAGE_URLS);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState('');

    const uploadFile = (event) => {
        event.preventDefault();
        setUploading(true);
        setUploadResult('');
        onUploaded('');

        const formData = new FormData(event.currentTarget);
        authenticatedJson('/bulkoperation.json', {
            method: 'POST',
            body: formData,
        }).then((json) => {
            console.log(JSON.stringify(json, null, 4));
            setUploading(false);
            setUploadResult(`Uploaded ${json.productCount} products.`);
            onUploaded(json.key);
        }).catch((error) => {
            console.log(`${error}`);
            setUploading(false);
            setUploadResult(`${error}`);
        });
    };

    return (
        <form method="post" encType="multipart/form-data" onSubmit={uploadFile}>
            <p>
                Upload your product JSONL file to import. <s-button variant="tertiary" icon="download" type="button" onClick={downloadSample}>Download sample.jsonl</s-button>
            </p>
            <p>
                Each JSONL line must use <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/productSet" target="_blank">productSet mutation variables</s-link> format and contain no more than three variants. You can convert JSON to JSONL with
                tools such as <s-link href="https://tableconvert.com/json-to-jsonlines" target="_blank">this converter</s-link>.
            </p>
            <br />
            <s-drop-zone label="Product JSONL file" name="file" accept=".jsonl"></s-drop-zone>
            <br />
            <s-text-area
                label="Public product image URLs (comma-separated)"
                name="imageUrls"
                rows={8}
                value={imageUrls}
                onInput={(event) => setImageUrls(event.currentTarget.value)}
            ></s-text-area>
            <p>
                URLs are assigned to products in JSONL line order and reused from the beginning when the file contains more products than URLs.
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
