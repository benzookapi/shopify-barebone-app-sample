import {
  reactExtension,
  useApi,
  AdminBlock,
  BlockStack,
  Text,
} from '@shopify/ui-extensions-react/admin';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const {extension: {target}, i18n, data} = useApi(TARGET);
  console.log({data});

  return (
    // The AdminBlock component provides an API for setting the title and summary of the Block extension wrapper.
    <AdminBlock summary="3 items">
      <BlockStack>
        <Text fontWeight="bold">{i18n.translate('welcome', {target})}</Text>
      </BlockStack>
    </AdminBlock>
  );
}