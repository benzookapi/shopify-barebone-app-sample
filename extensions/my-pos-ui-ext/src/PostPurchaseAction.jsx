import '@shopify/ui-extensions/preact';
import {render} from 'preact';

const ActionItemComponent = () => (
  <s-button onClick={() => shopify.action.presentModal()} />
);

export default async () => {
  render(<ActionItemComponent />, document.body);
};
