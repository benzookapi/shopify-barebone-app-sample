import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

const Modal = () => {
  const [status, setStatus] = useState('');
  const [printers, setPrinters] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [printing, setPrinting] = useState(false);

  const discoverPrinters = () => {
    setDiscovering(true);

    return shopify.printing.getPrinters().then((availablePrinters) => {
      setPrinters(availablePrinters);
      const connectedCount = availablePrinters.filter((printer) => printer.connected).length;
      setStatus(availablePrinters.length === 0
        ? 'No hardware receipt printers found.'
        : `${connectedCount} of ${availablePrinters.length} hardware printers connected.`);
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setPrinters([]);
      setStatus(`Printer discovery failed: ${message}`);
      console.log(`Printer discovery failed: ${message}`);
    }).finally(() => {
      setDiscovering(false);
    });
  };

  useEffect(() => {
    discoverPrinters();
  }, []);

  const print = (printer = null) => {
    setPrinting(true);
    setStatus('Loading the printable document...');

    return shopify.session.getSessionToken().then((token) => {
      if (!token) {
        throw new Error('Unable to get a session token for printing.');
      }

      const path = `/mocklogin?sessiontoken=${encodeURIComponent(token)}`;
      shopify.toast.show(`Printing '${path}'...`);

      // FYI you can fetch the app server directly with the session token.
      /*fetch(path).then((r) => {
        // Do something.
      });*/

      return printer
        ? shopify.printing.print(path, {printer})
        : shopify.printing.print(path);
    }).then(() => {
      setStatus(printer
        ? `The document was sent directly to ${printer.name}.`
        : 'The system print dialog was opened.');
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Printing failed: ${message}`);
      console.log(`Printing failed: ${message}`);
      shopify.toast.show(`Printing failed: ${message}`);
    }).finally(() => {
      setPrinting(false);
    });
  };

  const connectedPrinters = printers.filter((printer) => printer.connected);

  return (
    <s-page heading="Print document">
      <s-scroll-box padding="base">
        <s-stack gap="base">
          {printers.map((printer) => (
            <s-text key={printer.id}>
              {`${printer.name}: ${printer.connected ? 'Connected' : 'Disconnected'}`}
            </s-text>
          ))}
          <s-button disabled={discovering || printing} onClick={discoverPrinters}>
            Refresh printers
          </s-button>
          {connectedPrinters.map((printer) => (
            <s-button
              key={printer.id}
              variant="primary"
              disabled={discovering || printing}
              onClick={() => print(printer)}
            >
              {`Print to ${printer.name}`}
            </s-button>
          ))}
          <s-button disabled={discovering || printing} onClick={() => print()}>
            Use system print dialog
          </s-button>
          {status && <s-text>{status}</s-text>}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
};

export default async () => {
  render(<Modal />, document.body);
};
