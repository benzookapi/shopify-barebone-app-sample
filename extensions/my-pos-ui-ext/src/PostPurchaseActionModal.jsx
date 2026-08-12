import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState} from 'preact/hooks';

const Modal = () => {
  const [status, setStatus] = useState('');

  const print = async () => {
    setStatus('Loading the printable document...');

    try {
      const path = '/mocklogin';
      await shopify.printing.print(path);
      setStatus('The system print dialog was requested.');
      shopify.toast.show(`Printing '${path}'...`);

      // Relative app URLs receive a Shopify session token automatically.
      /*fetch('/mocklogin').then((r) => {
        // Do something.
      });*/
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Printing failed: ${message}`);
      console.log(`Printing failed: ${message}`);
      shopify.toast.show(`Printing failed: ${message}`);
    }
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
