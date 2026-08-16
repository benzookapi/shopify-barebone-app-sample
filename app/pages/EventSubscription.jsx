const webhookConfiguration = `[[webhooks.subscriptions]]
topics = [ "inventory_levels/update", "carts/update", "carts/create" ]
uri = "/webhookcommon"
compliance_topics = [ "customers/data_request", "customers/redact", "shop/redact" ]`;

function EventSubscription() {
  return (
    <s-page heading="Event Subscription and webhooks">
      <s-stack direction="block" gap="large">
        <s-section heading="Example app-specific webhook subscription">
          <s-stack direction="block" gap="base">
            <s-text>
              The following is an example of receiving webhooks configured in <s-badge>shopify.app.toml</s-badge>. All listed topics are delivered to the shared <s-badge>/webhookcommon</s-badge> endpoint.
            </s-text>
            <s-box padding="base" background="subdued" border="base" borderRadius="base">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}><code>{webhookConfiguration}</code></pre>
            </s-box>
            <s-unordered-list>
              <s-list-item>
                Example operational topics: <s-badge>inventory_levels/update</s-badge>, <s-badge>carts/update</s-badge>, and <s-badge>carts/create</s-badge>.
              </s-list-item>
              <s-list-item>
                Example compliance topics: <s-badge>customers/data_request</s-badge>, <s-badge>customers/redact</s-badge>, and <s-badge>shop/redact</s-badge>. These compliance subscriptions are required for apps distributed through the Shopify App Store.
              </s-list-item>
              <s-list-item>
                The common handler <s-link href="https://shopify.dev/docs/apps/build/webhooks/verify-deliveries" target="_blank">verifies the Shopify webhook HMAC</s-link> and logs the request metadata and complete payload for this sample.
              </s-list-item>
            </s-unordered-list>
            <s-link href="https://shopify.dev/docs/apps/build/webhooks/subscribe" target="_blank">Configure app-specific webhook subscriptions in shopify.app.toml</s-link>
          </s-stack>
        </s-section>

        <s-section heading="Webhook receivers in this sample">
          <s-stack direction="block" gap="base">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Endpoint</s-table-header>
                <s-table-header listSlot="labeled">Purpose</s-table-header>
                <s-table-header listSlot="labeled">Registration</s-table-header>
              </s-table-header-row>
              <s-table-body>
                <s-table-row>
                  <s-table-cell><s-badge>/webhookcommon</s-badge></s-table-cell>
                  <s-table-cell>Shared receiver for the operational and compliance topics listed above.</s-table-cell>
                  <s-table-cell>Use as the <s-badge>uri</s-badge> in your own app-specific TOML subscription.</s-table-cell>
                </s-table-row>
                <s-table-row>
                  <s-table-cell><s-badge>/webhookgdpr</s-badge></s-table-cell>
                  <s-table-cell>Alternative compliance webhook route that delegates to the same shared handler.</s-table-cell>
                  <s-table-cell>Available as an alternative route; configure it explicitly if your app uses it.</s-table-cell>
                </s-table-row>
                <s-table-row>
                  <s-table-cell><s-badge>/fulfillment_order_notification</s-badge></s-table-cell>
                  <s-table-cell>Verifies and logs fulfillment service notifications, acknowledges immediately, then processes fulfillment requests in the background.</s-table-cell>
                  <s-table-cell>Used by the fulfillment service callback flow, not by the TOML webhook subscription.</s-table-cell>
                </s-table-row>
                <s-table-row>
                  <s-table-cell><s-badge>/flowaction</s-badge></s-table-cell>
                  <s-table-cell>Compatibility receiver for Shopify Flow action requests that delegates to the shared handler.</s-table-cell>
                  <s-table-cell>Implemented, but no Flow extension is configured in this repository.</s-table-cell>
                </s-table-row>
              </s-table-body>
            </s-table>
            <s-banner heading="Logging caution" tone="warning">
              These receivers log complete payloads for demonstration and debugging. Restrict access to logs and redact protected customer or order data before using this pattern in production.
            </s-banner>
          </s-stack>
        </s-section>

        <s-section heading="Related fulfillment service callbacks">
          <s-stack direction="block" gap="base">
            <s-text>
              The app also exposes <s-badge>/fetch_tracking_numbers.json</s-badge> and <s-badge>/fetch_stock.json</s-badge> for the fulfillment service sample. They are service callbacks, not webhook or Event subscriptions.
            </s-text>
            <s-text>
              For demonstration, a fulfillment request is accepted and then completed after a five-second background delay. Production apps should use a durable job queue instead of an in-process timer.
            </s-text>
          </s-stack>
        </s-section>

        <s-section heading="Next-generation Events">
          <s-stack direction="block" gap="base">
            <s-banner heading="Developer preview: not implemented yet" tone="info">
              This sample plans to add an Event subscription in a future update. Classic webhooks remain the implemented delivery mechanism in the current version.
            </s-banner>
            <s-text>
              Events provide field-level triggers, custom GraphQL payloads, and query-based delivery filters. They currently use the unstable API and support a subset of topics during the Developer Preview, so apps can keep classic webhooks alongside Events while evaluating the new model.
            </s-text>
            <s-link href="https://shopify.dev/docs/apps/build/events-webhooks" target="_blank">About Events and webhooks</s-link>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export default EventSubscription;
