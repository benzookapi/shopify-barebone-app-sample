import '@shopify/ui-extensions/preact';
import {render} from 'preact';

const Modal = () => {
  const print = async () => {
    try {
      const token = await shopify.session.getSessionToken();
      if (!token) {
        shopify.toast.show('Unable to get a session token for printing.');
        return;
      }

      const path = `/mocklogin?sessiontoken=${encodeURIComponent(token)}`;
      await shopify.printing.print(path);
      shopify.toast.show(`Printing '${path}'...`);

      // FYI you can fetch the app server directly with the session token.
      /*fetch(`https://APP_URL/mocklogin?sessiontoken=${token}`).then((r) => {
        // Do something.
      });*/
    } catch (error) {
      console.log(`Printing failed: ${error}`);
      shopify.toast.show(`Printing failed: ${error}`);
    }
  };

  return (
    <s-page heading="Hello World!">
      <s-scroll-box padding="base">
        <s-stack gap="base">
          <s-text>Welcome to the extension!</s-text>
          <s-button onClick={print}>Print</s-button>
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
};

export default async () => {
  render(<Modal />, document.body);
};
