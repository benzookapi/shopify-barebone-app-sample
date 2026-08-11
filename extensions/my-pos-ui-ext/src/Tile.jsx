import '@shopify/ui-extensions/preact';
import {render} from 'preact';

const TileComponent = () => (
  <s-tile
    heading="My app"
    subheading="SmartGrid Preact Extension"
    onClick={() => shopify.action.presentModal()}
  />
);

export default async () => {
  render(<TileComponent />, document.body);
};
