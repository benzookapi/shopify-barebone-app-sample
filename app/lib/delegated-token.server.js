import { callAdminGraphql } from './shopify-graphql.server.js';
import { withFreshOfflineToken } from './offline-token.server.js';

const DELEGATE_TOKEN_CREATE = `mutation DelegateAccessTokenCreate($input: DelegateAccessTokenInput!) {
  delegateAccessTokenCreate(input: $input) {
    delegateAccessToken {
      accessScopes
      accessToken
      createdAt
    }
    shop {
      id
      name
    }
    userErrors {
      field
      message
    }
  }
}`;

const SHOP_PRIVATE_TOKEN_QUERY = `query BareboneDelegatedToken {
  shop {
    id
    metafield(namespace: "barebone_app", key: "delegated_private_token") {
      id
      value
    }
  }
}`;

const METAFIELDS_SET = `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      value
    }
    userErrors {
      field
      message
    }
  }
}`;

export function createDelegatedTokenManager({
  callAdmin = callAdminGraphql,
  withFreshToken = withFreshOfflineToken,
  now = Date.now,
} = {}) {
  async function create(shop, parent) {
    const issuedAt = now();
    // Shopify bounds delegated tokens by their parent. Leave a margin for request latency.
    const expiresIn = Math.min(86400, Math.floor((Date.parse(parent.access_token_expires_at) - issuedAt) / 1000) - 60);
    if (expiresIn <= 0) throw new Error('The parent token expires too soon. Retry token preparation.');
    const result = await callAdmin(shop, DELEGATE_TOKEN_CREATE, {
      input: {
        delegateAccessScope: [
          'write_products',
          'write_discounts',
          'write_orders',
          'write_payment_customizations',
          'unauthenticated_read_product_listings',
          'unauthenticated_read_selling_plans',
        ],
        expiresIn,
      },
    }, parent.access_token);
    const created = result.data?.delegateAccessTokenCreate;
    if (!created?.delegateAccessToken?.accessToken || created.userErrors?.length) {
      throw new Error('Unable to create the delegated Storefront token. Check the app scopes.');
    }
    const token = {
      ...created.delegateAccessToken,
      expires_at: new Date(issuedAt + expiresIn * 1000).toISOString(),
      parent_token_generation: parent.token_generation,
    };
    const saved = await callAdmin(shop, METAFIELDS_SET, {
      metafields: [{
        key: 'delegated_private_token',
        namespace: 'barebone_app',
        ownerId: created.shop.id,
        type: 'json',
        value: JSON.stringify(token),
      }],
    }, parent.access_token);
    if (!saved.data?.metafieldsSet || saved.data.metafieldsSet.userErrors?.length) {
      throw new Error('Unable to store the delegated Storefront token.');
    }
    return token;
  }

  return {
    create(shop) {
      return withFreshToken(shop, (parent) => create(shop, parent));
    },
    get(shop) {
      return withFreshToken(shop, async (parent) => {
        const result = await callAdmin(shop, SHOP_PRIVATE_TOKEN_QUERY, null, parent.access_token);
        if (result.errors?.length || !result.data?.shop) {
          throw new Error('Unable to read the delegated Storefront token.');
        }
        const value = result.data.shop.metafield?.value;
        if (!value) {
          throw new Response('No delegated private Storefront token is stored. Prepare tokens first.', { status: 400 });
        }
        let token;
        try { token = JSON.parse(value); } catch { /* Replace legacy or malformed stored metadata. */ }
        if (token?.accessToken && parent.token_generation
          && token.parent_token_generation === parent.token_generation
          && Date.parse(token.expires_at) - now() > 60_000) return token;
        return create(shop, parent);
      });
    },
  };
}

const manager = createDelegatedTokenManager();
export const createDelegatedStorefrontToken = manager.create;
export const getDelegatedStorefrontToken = manager.get;
