import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { API_VERSION, CUSTOMER_ACCOUNT_CLIENT_ID } from './env.server.js';
import { callAdminGraphql, callStorefrontGraphql } from './shopify-graphql.server.js';
import { getCustomerAccountSession } from './customer-account.server.js';
import { htmlSecurityHeaders } from './http.server.js';
import { getPublicOrigin } from './public-url.server.js';

const STOREFRONT_TOKEN_CREATE = `mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
  storefrontAccessTokenCreate(input: $input) {
    shop {
      id
      name
    }
    storefrontAccessToken {
      accessScopes {
        handle
      }
      accessToken
      createdAt
      id
      title
      updatedAt
    }
    userErrors {
      field
      message
    }
  }
}`;

const STOREFRONT_TOKENS_QUERY = `query StorefrontAccessTokens {
  shop {
    storefrontAccessTokens(first: 100) {
      nodes {
        accessToken
        id
        title
      }
    }
  }
}`;

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

const PRODUCT_QUERY = `query StorefrontProducts($country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  products(first: 3) {
    nodes {
      id
      title
      variants(first: 1) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
}`;

const CART_CREATE_MUTATION = `mutation StorefrontCartCreate($input: CartInput!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  cartCreate(input: $input) {
    cart {
      id
      totalQuantity
      checkoutUrl
      buyerIdentity {
        countryCode
        email
        phone
      }
      cost {
        subtotalAmount {
          amount
          currencyCode
        }
        totalAmount {
          amount
          currencyCode
        }
      }
      lines(first: 10) {
        nodes {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product {
                title
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
      code
    }
    warnings {
      message
      code
      target
    }
  }
}`;

const BUYER_IDENTITY_MUTATION = `mutation StorefrontCartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
    cart {
      id
      checkoutUrl
      buyerIdentity {
        countryCode
        email
        phone
        customer {
          id
          email
          firstName
          lastName
        }
      }
    }
    userErrors {
      field
      message
      code
    }
    warnings {
      message
      code
      target
    }
  }
}`;

const DELIVERY_ADDRESS_MUTATION = `mutation StorefrontCartDeliveryAddressesAdd($cartId: ID!, $addresses: [CartSelectableAddressInput!]!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  cartDeliveryAddressesAdd(cartId: $cartId, addresses: $addresses) {
    cart {
      id
      checkoutUrl
      delivery {
        addresses {
          id
          selected
          oneTimeUse
          address {
            ... on CartDeliveryAddress {
              firstName
              lastName
              company
              address1
              address2
              city
              provinceCode
              zip
              countryCode
            }
          }
        }
      }
      deliveryGroups(first: 10) {
        nodes {
          id
          deliveryOptions {
            handle
            title
            code
            deliveryMethodType
            estimatedCost {
              amount
              currencyCode
            }
          }
          selectedDeliveryOption {
            handle
            title
          }
        }
      }
    }
    userErrors {
      field
      message
      code
    }
    warnings {
      message
      code
      target
    }
  }
}`;

const DELIVERY_OPTION_MUTATION = `mutation StorefrontCartSelectedDeliveryOptionsUpdate($cartId: ID!, $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
    cart {
      id
      checkoutUrl
      deliveryGroups(first: 10) {
        nodes {
          id
          deliveryOptions {
            handle
            title
          }
          selectedDeliveryOption {
            handle
            title
            estimatedCost {
              amount
              currencyCode
            }
          }
        }
      }
    }
    userErrors {
      field
      message
      code
    }
    warnings {
      message
      code
      target
    }
  }
}`;

export async function prepareStorefrontAccess(shop, origin) {
  const response = {
    shop,
    public_token: '',
    private_token: '',
    tokenless_url: `https://${shop}/api/${API_VERSION}/graphql.json`,
    customer_account_client_id: CUSTOMER_ACCOUNT_CLIENT_ID,
    customer_account_callback_url: `${origin}/customer-account/callback`,
    error_count: 0,
    error_messages: [],
  };

  let result = await callAdminGraphql(shop, STOREFRONT_TOKEN_CREATE, {
    input: {
      title: 'Barebone App Storefront',
    },
  });
  const tokenCreate = result.data?.storefrontAccessTokenCreate;
  if (tokenCreate == null) {
    response.error_count += 1;
    response.error_messages.push(`storefrontAccessTokenCreate: ${JSON.stringify(result.errors || result)}`);
  } else if (tokenCreate.userErrors.length > 0) {
    const existingToken = await getExistingStorefrontToken(shop);
    if (existingToken != null) {
      response.public_token = existingToken;
      response.error_messages.push(`storefrontAccessTokenCreate skipped: ${JSON.stringify(tokenCreate.userErrors[0])}`);
    } else {
      response.error_count += 1;
      response.error_messages.push(`storefrontAccessTokenCreate: ${JSON.stringify(tokenCreate.userErrors[0])}`);
    }
  } else {
    response.public_token = tokenCreate.storefrontAccessToken;
  }

  result = await callAdminGraphql(shop, DELEGATE_TOKEN_CREATE, {
    input: {
      delegateAccessScope: [
        'write_products',
        'write_discounts',
        'write_orders',
        'write_payment_customizations',
        'unauthenticated_read_product_listings',
        'unauthenticated_read_selling_plans',
      ],
      expiresIn: 60 * 60 * 24,
    },
  });
  if (result.data.delegateAccessTokenCreate.userErrors.length > 0) {
    response.error_count += 1;
    response.error_messages.push(`delegateAccessTokenCreate: ${JSON.stringify(result.data.delegateAccessTokenCreate.userErrors[0])}`);
  } else {
    const shopId = result.data.delegateAccessTokenCreate.shop.id;
    response.private_token = result.data.delegateAccessTokenCreate.delegateAccessToken;
    const metafieldResult = await callAdminGraphql(shop, METAFIELDS_SET, {
      metafields: [
        {
          key: 'delegated_private_token',
          namespace: 'barebone_app',
          ownerId: shopId,
          type: 'json',
          value: JSON.stringify(response.private_token),
        },
      ],
    });
    if (metafieldResult.data.metafieldsSet.userErrors.length > 0) {
      response.error_count += 1;
      response.error_messages.push(`metafieldsSet: ${JSON.stringify(metafieldResult.data.metafieldsSet.userErrors[0])}`);
    }
  }

  return response;
}

async function getExistingStorefrontToken(shop) {
  const result = await callAdminGraphql(shop, STOREFRONT_TOKENS_QUERY);
  const tokens = result.data?.shop?.storefrontAccessTokens?.nodes || [];
  return tokens.find((token) => token.title === 'Barebone App Storefront') || tokens[0] || null;
}

export async function renderStorefrontPage(request, { shop, publicToken }) {
  const template = await readFile(resolve(process.cwd(), 'views/storefront.html'), 'utf8');
  const customerSession = getCustomerAccountSession(request);
  const replacements = {
    shop,
    public_token: publicToken,
    api_version: API_VERSION,
    customer_account_client_id: CUSTOMER_ACCOUNT_CLIENT_ID,
    customer_account_callback_url: `${getPublicOrigin(request)}/customer-account/callback`,
    customer_account_profile: JSON.stringify(customerSession != null ? customerSession.profile : null),
  };

  const html = template.replace(/<%=\s*([\w_]+)\s*%>/g, (_match, key) => replacements[key] ?? '');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...htmlSecurityHeaders(shop, false),
    },
  });
}

export async function callPrivateStorefrontAction({ shop, action, locale, variables, buyerIp }) {
  const token = await getPrivateStorefrontToken(shop);
  const context = parseLocale(locale);
  let result;

  if (action === 'show_product') {
    result = await callStorefrontGraphql(shop, PRODUCT_QUERY, {
      country: context.country,
      language: context.language,
    }, token.accessToken, buyerIp);
  } else if (action === 'create_cart') {
    result = await callStorefrontGraphql(shop, CART_CREATE_MUTATION, {
      input: variables,
      country: context.country,
      language: context.language,
    }, token.accessToken, buyerIp);
  } else if (action === 'update_buyer') {
    result = await callStorefrontGraphql(shop, BUYER_IDENTITY_MUTATION, {
      cartId: variables.cartId,
      buyerIdentity: variables.buyerIdentity,
      country: context.country,
      language: context.language,
    }, token.accessToken, buyerIp);
  } else if (action === 'add_address') {
    result = await callStorefrontGraphql(shop, DELIVERY_ADDRESS_MUTATION, {
      cartId: variables.cartId,
      addresses: variables.addresses,
      country: context.country,
      language: context.language,
    }, token.accessToken, buyerIp);
  } else if (action === 'set_option') {
    result = await callStorefrontGraphql(shop, DELIVERY_OPTION_MUTATION, {
      cartId: variables.cartId,
      selectedDeliveryOptions: variables.selectedDeliveryOptions,
      country: context.country,
      language: context.language,
    }, token.accessToken, buyerIp);
  } else {
    throw new Response('Unknown Storefront action', { status: 400 });
  }

  if (result.data) {
    result.data.used_api = 'Server side Storefront API';
  }
  return result;
}

async function getPrivateStorefrontToken(shop) {
  const result = await callAdminGraphql(shop, SHOP_PRIVATE_TOKEN_QUERY);
  const value = result.data?.shop?.metafield?.value;
  if (!value) {
    throw new Response('No delegated private Storefront token is stored. Prepare tokens first.', { status: 400 });
  }
  return JSON.parse(value);
}

function parseLocale(locale) {
  if (typeof locale === 'string' && locale) {
    const parsed = JSON.parse(locale);
    return {
      country: parsed.country,
      language: parsed.language || parsed.lang,
    };
  }
  return {
    country: 'US',
    language: 'EN',
  };
}
