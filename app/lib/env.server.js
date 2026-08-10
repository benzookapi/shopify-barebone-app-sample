export const API_KEY = process.env.SHOPIFY_API_KEY || '';
export const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
export const API_VERSION = process.env.SHOPIFY_API_VERSION || process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';
export const APP_URL = process.env.BASE_URL || process.env.SHOPIFY_APP_URL || '';

export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_FORM = 'application/x-www-form-urlencoded';

export const GRAPHQL_PATH_ADMIN = `admin/api/${API_VERSION}/graphql.json`;
export const GRAPHQL_PATH_STOREFRONT = `api/${API_VERSION}/graphql.json`;

export const DB_TYPE = (process.env.SHOPIFY_DB_TYPE || 'MONGODB').toUpperCase();

export const MONGO_URL = process.env.SHOPIFY_MONGO_URL || '';
export const MONGO_DB_NAME = process.env.SHOPIFY_MONGO_DB_NAME || '';
export const MONGO_COLLECTION = 'shops';

export const POSTGRESQL_URL = process.env.SHOPIFY_POSTGRESQL_URL || '';
export const POSTGRESQL_TABLE = 'shops';

export const MYSQL_HOST = process.env.SHOPIFY_MYSQL_HOST || '';
export const MYSQL_USER = process.env.SHOPIFY_MYSQL_USER || '';
export const MYSQL_PASSWORD = process.env.SHOPIFY_MYSQL_PASSWORD || '';
export const MYSQL_DATABASE = process.env.SHOPIFY_MYSQL_DATABASE || '';
export const MYSQL_TABLE = 'shops';

export const CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID ||
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID ||
  '';
export const CUSTOMER_ACCOUNT_SCOPE = 'openid email customer-account-api:full';
export const CUSTOMER_ACCOUNT_SESSION_COOKIE = 'barebone_customer_session';
export const USER_AGENT = 'My_Shopify_Barebone_App';
