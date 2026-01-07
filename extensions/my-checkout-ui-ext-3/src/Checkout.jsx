// This skelton block expands collasped summary info at the bottom of mobile checkout page with `block_progress` = true.
// No visible UI is needed to do that.

import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body)
};

function Extension() {  
  return (
    <></>
  );  
}