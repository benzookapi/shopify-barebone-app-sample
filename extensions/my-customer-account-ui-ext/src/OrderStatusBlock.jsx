import {
  BlockStack,
  reactExtension,
  TextBlock,
  Banner,
  useApi
} from "@shopify/ui-extensions-react/customer-account";

export default reactExtension(
  "customer-account.order-status.block.render",
  () => <PromotionBanner />
);

function PromotionBanner() {
  const { i18n } = useApi();

  return (
    <Banner>
      <BlockStack inlineAlignment="center" >
        <TextBlock>
          {i18n.translate("earnPoints")}
        </TextBlock>
      </BlockStack>
    </Banner>
  );
}