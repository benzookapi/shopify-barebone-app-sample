import { useState, useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Badge, Text, Spinner, List, BlockStack, Button, Label, Form, ButtonGroup } from '@shopify/polaris';

import { _decodeSessionToken, _getAdminFromShop, _getShopFromQuery } from "../utils/my_util";

// Bulk opearation sample for product impporting with a file uploader.
// See https://shopify.dev/docs/api/usage/bulk-operations/imports
function BulkOperation() {
    const app = useAppBridge();

    const shop = _getShopFromQuery(window);

    const [data, setData] = useState({});

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
        authenticatedFetch(app)(`/bulkoperation?check=${true}`).then((response) => {
            response.json().then((json) => {
                console.log(JSON.stringify(json, null, 4));
                setRes(JSON.stringify(json, null, 4));
                setId(json.data.currentBulkOperation.id);
                setUrl(json.data.currentBulkOperation.url);
                setPUrl(json.data.currentBulkOperation.partialDataUrl);
            }).catch((e) => {
                console.log(`${e}`);
                setRes(``);
                setId(``);
                setUrl(``);
                setPUrl(``);
            });
        });
    };

    useEffect(() => {
        authenticatedFetch(app)(`/bulkoperation?`).then((response) => {
            response.json().then((json) => {
                console.log(JSON.stringify(json, null, 4));
                setData(json);
                json.data.stagedUploadsCreate.stagedTargets[0].parameters.map((param) => {
                    if (param.name === 'key') setKey(param.value);
                });
            }).catch((e) => {
                console.log(`${e}`);
                setData({});
            });
        });
        showStatus();
    }, ['']);

    return (
        <Page title="Bulk operation sample for product importing with a file uploader">
            <BlockStack gap="500">
                <Card sectioned={true}>
                    <Link url="https://shopify.dev/docs/api/usage/bulk-operations/imports" target="_blank">Dev. doc</Link>
                    <br /><br />
                    <List type="number">
                        <List.Item>
                            <FileUploader data={data}></FileUploader>
                            <p>&nbsp;</p>
                        </List.Item>
                        <List.Item>
                            <p>
                                Run the bulk operation for product creations from the uploaded file above with the key: <Badge>{key}</Badge> which is generated initially while loading this page.
                            </p>
                            <p>&nbsp;</p>
                            <Button variant="primary" onClick={() => {
                                setAccessing(true);
                                authenticatedFetch(app)(`/bulkoperation?key=${key}`).then((response) => {
                                    response.json().then((json) => {
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
                                });
                            }}>
                                Run the operation
                            </Button>&nbsp;
                            <Badge status='info'>Result: <APIResult2 res={result} loading={accessing} /></Badge>
                            <p>&nbsp;</p>
                        </List.Item>
                        <List.Item>
                            <p>
                                After the operation started, you can check the latest status with <Link url={`https://shopify.dev/docs/api/admin-graphql/unstable/objects/queryroot#field-queryroot-currentbulkoperation`} target="_blank">
                                    currentBulkOperation query</Link> and seeing <Link url={`https://${_getAdminFromShop(shop)}/products`} target="_blank">Products</Link>.
                            </p>
                            <p>&nbsp;</p>
                            <Button variant="primary" onClick={() => {
                                showStatus();
                            }}>
                                Check the latest status
                            </Button>
                            <p>&nbsp;</p>
                            <p>
                                <b>The last operation:</b>
                                &nbsp; {url != null ? <Link url={url} target="_blank">Result data</Link> : ''}
                                &nbsp; {pUrl != null ? <Link url={pUrl} target="_blank">Partial data</Link> : ''}
                            </p>
                            <APIResult res={res} />
                            <p>&nbsp;</p>
                            <Button variant="primary" onClick={() => {
                                setRes(``);
                                authenticatedFetch(app)(`/bulkoperation?id=${id}`).then((response) => {
                                    response.json().then((json) => {
                                        console.log(JSON.stringify(json, null, 4));
                                    }).catch((e) => {
                                        console.log(`${e}`);
                                    });
                                });
                                showStatus();
                            }}>
                                Cancel the current operation
                            </Button>
                            <p>&nbsp;</p>
                        </List.Item>
                    </List>
                </Card>
                <Card sectioned={true}>
                    <List type="bullet">
                        <List.Item>
                            <p>
                                For <b>data export with queries</b>, you can test it out reading <Link url={`https://shopify.dev/docs/api/usage/bulk-operations/queries`} target="_blank">the dev. doc</Link> with <Link url={`https://shopify.dev/docs/apps/tools/graphiql-admin-api`} target="_blank">Shopify Admin API GraphiQL Explorer</Link>.
                            </p>
                        </List.Item>
                    </List>
                </Card>
            </BlockStack>
        </Page>
    );
}

function FileUploader(props) {
    if (Object.keys(props.data).length === 0) {
        return <Spinner accessibilityLabel="Calling Order GraphQL" size="large" />;
    }
    const target = props.data.data.stagedUploadsCreate.stagedTargets[0];
    return (
        <form action={`${target.url}`} method="post" enctype="multipart/form-data" target="_blank">
            {
                target.parameters.map((param) => {
                    return <input type="hidden" name={param.name} value={param.value} />
                })
            }
            <p>
                Upload your product JSONL file to import. (<Link url={new URL('../assets/sample.jsonl', import.meta.url).href} target="_blank">Sample</Link>)
            </p>
            <p>
                Your JSONL file needs to have each line in <Link url={`https://shopify.dev/docs/api/admin-graphql/unstable/mutations/productcreate`} target="_blank">productCreate mutation variables</Link> format and you can convert JSON to JSONL in
                some useful sites like <Link url={`https://tableconvert.com/json-to-jsonlines`} target="_blank">this</Link>.
            </p>
            <br />
            <input type="file" name="file" />
            <br /><br />
            <button style={{ "font-size": "large" }} type="submit">Upload</button>
        </form>
    );
}

function APIResult(props) {
    if (Object.keys(props.res).length === 0) {
        return <Spinner accessibilityLabel="Calling Order GraphQL" size="large" />;
    }
    return (<pre>{props.res}</pre>);
}

function APIResult2(props) {
    if (props.loading) {
        return <Spinner accessibilityLabel="Calling Order GraphQL" size="small" />;
    }
    return (<span>{props.res}</span>);
}

export default BulkOperation