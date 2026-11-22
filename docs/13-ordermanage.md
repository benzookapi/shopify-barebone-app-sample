# Order Management

## Purpose

The `/ordermanage` sample covers fulfillment, payment capture, fulfillment-service registration, and inventory updates through server-side Admin API calls.

## Order Action Sequence

An order Admin Link opens the sample. An external OMS can use the same server-side fulfillment and capture operations.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant (OMS)
    participant Admin as Shopify order details
    participant UI as /ordermanage page
    participant App as /ordermanage.json
    participant API as Admin GraphQL API

    Merchant->>Admin: Open order action
    Admin->>UI: Load page with order id
    UI->>App: Authenticated order query
    App->>API: Query order, fulfillments, transactions, fulfillment orders
    API-->>UI: Current order state
    alt Fulfill order
        Merchant->>UI: Select fulfillment action
        UI->>App: Send fulfillment order IDs
        App->>API: fulfillmentCreate
    else Capture payment
        Merchant->>UI: Select capturable transactions
        UI->>App: Send parent transaction IDs and amounts
        App->>API: orderCapture
    end
    API-->>UI: Updated order details and user errors
```

## Fulfillment Service Sequence

A [fulfillment service](https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps) creates an app-managed location and delegates fulfillment to the merchant's backend system, such as a warehouse or order management system. Assign product inventory to that location before testing.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant (OMS)
    participant UI as Order management UI
    participant App as Remote app server
    participant Shopify as Shopify

    Merchant->>UI: Create fulfillment service
    UI->>App: Authenticated request
    App->>Shopify: fulfillmentServiceCreate
    Shopify-->>App: Service and app location
    App->>Shopify: Store service ID in shop metafield
    Merchant->>UI: Adjust inventory
    UI->>App: Quantity delta, name, reason, optional ledger URI
    App->>Shopify: Query location and inventory items
    loop Each inventory level
        App->>Shopify: inventoryAdjustQuantities with idempotency key
    end
    opt Shopify requests stock or tracking
        Shopify->>App: GET stock or tracking callback
        App-->>Shopify: JSON response
    end
```

<a name="external-erp-inventory-synchronization"></a>

## Inventory Sync with Merchant Backend Systems

When the merchant's backend system (such as an ERP or another core business system) is the source of truth for inventory, send its stock changes to Shopify and sync Shopify's sellable quantities back to it.

For a production integration, save each webhook to a durable queue before acknowledging receipt. Run **one job at a time per app and shop** in a worker or scheduled batch. Refresh the offline access token when needed and pace Admin API calls using Shopify's rate-limit feedback (`extensions.cost.throttleStatus`). See [Offline token refresh before API use](00-ARCHITECTURE.md#offline-token-refresh-before-api-use).

```mermaid
sequenceDiagram
    autonumber
    participant Backend as Merchant backend system
    participant App as Webhook handler
    participant Jobs as Per-shop queue and worker
    participant Shopify as Shopify

    alt Inventory changes in the merchant's backend
        Backend->>App: Inventory webhook with item, location, and quantity change
        App->>Jobs: Persist adjustment job
        App-->>Backend: Acknowledge receipt
        Jobs->>Shopify: inventoryAdjustQuantities with idempotency key
    else Inventory changes in Shopify
        Note over Shopify: Checkout, Admin edit, or another app changes available inventory
        Shopify->>App: inventory_levels/update webhook to /webhookcommon
        App->>Jobs: Verify HMAC, deduplicate, and enqueue inventory lookup
        App-->>Shopify: Acknowledge receipt
        Jobs->>Shopify: Query InventoryItem and InventoryLevel quantities
        Shopify-->>Jobs: Latest available, committed, and on-hand values
        Jobs->>Backend: Update the inventory record
        Backend->>Backend: Store the new master or allocation state
    end
```

Map quantities by inventory item and location IDs. Apply changes from the merchant's backend using the inventory adjustment flow above. Deduplicate events and suppress echoes of your own writes.

### TIPS: Inventory Status Transformation

`Available` → `Committed when ordered` → `Removed from on_hand when fulfilled`

Order creation reduces `available` without changing `on_hand`; fulfillment reduces `committed` and `on_hand`. Shopify manages `committed` through orders and fulfillment, not direct inventory adjustments.

Use [`inventory_levels/update`](https://shopify.dev/docs/api/admin-graphql/unstable/enums/WebhookSubscriptionTopic#enums-INVENTORY_LEVELS_UPDATE) as a sellable-quantity notification, then query current quantities. It may not fire for later shipment transitions that leave `available` unchanged; track those by fulfillment order and delivery events.

## Fulfillment Request and Delivery Sequence

Register a fulfillment service first. The merchant's fulfillment action triggers Shopify's callback; the optional request message is available in `merchantRequests`.

The sample accepts requests, then simulates fulfillment and delivery with short delays. Correlate real external jobs by fulfillment order ID. A callback `200` acknowledges receipt; Admin API mutations change shipment state.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant (OMS)
    participant Shopify as Shopify
    participant App as Remote app server
    participant Backend as Merchant backend system

    Merchant->>Shopify: Select fulfillment action
    Shopify->>App: POST /fulfillment_order_notification
    App-->>Shopify: Immediate 200 acknowledgement
    App->>Shopify: Query assigned FULFILLMENT_REQUESTED orders and merchant requests
    Shopify-->>App: Fulfillment order IDs, messages, options, and timestamps
    loop Each requested fulfillment order
        App->>Shopify: fulfillmentOrderAcceptFulfillmentRequest
        Shopify-->>App: Request accepted
    end
    App->>Backend: Request preparation and shipment
    Backend-->>App: Shipment result and tracking information
    Note over App,Backend: The sample simulates this external processing time with a two-second delay
    loop Each accepted fulfillment order
        App->>Shopify: fulfillmentCreate with tracking information
        Shopify-->>App: Fulfillment created
    end
    App->>Backend: Continue the delivery workflow and wait for its status
    Backend-->>App: Delivery completed
    Note over App,Backend: The sample simulates this delivery wait with another two-second delay
    loop Each created fulfillment
        App->>Shopify: fulfillmentEventCreate with DELIVERED status
        Shopify-->>App: Delivered event created
    end
```

## How It Works

Fulfillment uses fulfillment order IDs; capture uses eligible authorization transactions and their parent IDs. Inventory changes use [`inventoryAdjustQuantities`](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/inventoryAdjustQuantities) with a UUID idempotency key and [`changeFromQuantity: null`](https://shopify.dev/docs/api/admin-graphql/unstable/input-objects/InventoryChangeInput), which intentionally skips compare-and-set checks.

## Common Pitfalls

- One order can have multiple fulfillment orders and transactions; check each one's eligibility.
- Capture only manually capturable authorizations using the correct parent transaction.
- Match inventory by item and location IDs; SKU alone is insufficient.
- Check adjustment name, reason, and ledger requirements. Omit an optional ledger URI or send `null`, not an empty string.
- Verify callback/webhook HMAC without relying on a browser session.
- Replace demo delays with durable, idempotent jobs before production.
- Deduplicate inventory events and prevent webhook-driven synchronization loops.

## Source Map

- [Management UI](../app/pages/OrderManage.jsx)
- [Order, capture, and inventory operations](../app/lib/order-manage.server.js)
- [Fulfillment and webhook callbacks](../app/lib/public-endpoints.server.js)
- [Order Admin Link](../extensions/my-admin-link-order-details/shopify.extension.toml)

## Official Shopify References

- [Fulfillment apps](https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps)
- [Build for fulfillment services](https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps/build-for-fulfillment-services)
- [Inventory management apps](https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps)
- [Manage inventory quantities and states](https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps/manage-quantities-states)
- [Inventory level update webhook topic](https://shopify.dev/docs/api/admin-graphql/unstable/enums/WebhookSubscriptionTopic#enums-INVENTORY_LEVELS_UPDATE)
- [Create a fulfillment](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/fulfillmentCreate)
- [Create a fulfillment event](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/fulfillmentEventCreate)
- [Adjust inventory quantities](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/inventoryAdjustQuantities)
