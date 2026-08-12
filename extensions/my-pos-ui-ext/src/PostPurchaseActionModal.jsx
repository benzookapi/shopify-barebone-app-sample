import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState} from 'preact/hooks';

const Modal = () => {
  const [status, setStatus] = useState('');

  const print = () => {
    setStatus('Loading the printable document...');

    // The Printing API authenticates this same-origin request with a session token.
    const path = '/mocklogin';
    shopify.printing.print(path).then(() => {
      setStatus('The system print dialog was opened.');
      shopify.toast.show('The system print dialog was opened.');

      // FYI you can fetch the app server directly with the session token.
      /*shopify.session.getSessionToken().then((token) => {
        return fetch(`/mocklogin?sessiontoken=${encodeURIComponent(token)}`);
      }).then((r) => {
        // Do something.
      });*/
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Printing failed: ${message}`);
      console.log(`Printing failed: ${message}`);
      shopify.toast.show(`Printing failed: ${message}`);
    });
  };

  return (
    <s-page heading="Hello World!">
      <s-scroll-box padding="base">
        <s-stack gap="base">
          <s-text>Welcome to the extension!</s-text>
          <s-button onClick={print}>Print</s-button>
          {status && <s-text>{status}</s-text>}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
};

export default async () => {
  render(<Modal />, document.body);
};
