import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<PromotionBanner />, document.body);
};

function PromotionBanner() {
  return (
    <s-banner>
      <s-stack alignItems="center">
        <s-text>{shopify.i18n.translate('earnPoints')}</s-text>
      </s-stack>
    </s-banner>
  );
}
