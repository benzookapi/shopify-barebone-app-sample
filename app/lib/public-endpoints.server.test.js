import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import jwt from 'jsonwebtoken';
import mongo from 'mongodb';

process.env.SHOPIFY_API_KEY = 'mock-login-test-app';
process.env.SHOPIFY_API_SECRET = 'mock-login-test-secret';
process.env.SHOPIFY_DB_TYPE = 'MONGODB';
process.env.SHOPIFY_MONGO_URL = 'mongodb://unused.test';
process.env.SHOPIFY_MONGO_DB_NAME = 'mock-login-test';

const { mockLogin } = await import('./public-endpoints.server.js');
const { createAppJwt } = await import('./shopify-auth.server.js');
const shop = 'demo.myshopify.com';
const accessToken = 'shpat_mock_login_test_only';
let record;
let lookups;

// Exercise the real installation lookup without connecting to a database.
mock.method(mongo.MongoClient, 'connect', async () => ({
  db: () => ({
    collection: () => ({
      findOne: async ({ _id }) => {
        lookups.push(_id);
        return record == null ? null : { data: record };
      },
    }),
  }),
  close: async () => {},
}));

beforeEach(() => {
  lookups = [];
  record = { shop, client_id: process.env.SHOPIFY_API_KEY, access_token: accessToken };
});

function request(params = {}, headers = {}) {
  const url = new URL('https://app.example.com/mocklogin');
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return new Request(url, { headers });
}

test('app JWT displays only the verified shop installation token below the JWT', async () => {
  record.refresh_token = 'do-not-render-refresh-token';
  const token = createAppJwt({ shop });
  const response = await mockLogin(request({ my_token: token, shop: 'other.myshopify.com' }));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.deepEqual(lookups, [shop]);
  assert.ok(body.includes(token));
  assert.ok(body.includes(accessToken));
  assert.ok(body.indexOf(accessToken) > body.indexOf(token));
  assert.ok(body.includes("The following is your access token stored in this app's database."));
  assert.ok(body.includes('Use it to call the Shopify Admin API from your server.'));
  assert.ok(body.includes('Demo only:'));
  assert.ok(!body.includes(record.refresh_token));
  assert.ok(!body.includes('other.myshopify.com'));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(response.headers.get('Content-Security-Policy'), "frame-ancestors 'none';");
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('missing JWT or a plain shop parameter does not load or display an access token', async () => {
  for (const params of [{}, { shop }, { shop, my_token: '' }]) {
    const response = await mockLogin(request(params));
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.ok(!body.includes(accessToken));
    assert.ok(!body.includes('your access token stored'));
  }
  assert.deepEqual(lookups, []);
});

test('invalid, forged, and expired app JWTs are rejected before database access', async () => {
  const tokens = [
    'invalid-token',
    jwt.sign({ shop }, 'wrong-secret', { expiresIn: '60s' }),
    jwt.sign({ shop }, process.env.SHOPIFY_API_SECRET, { expiresIn: -1 }),
  ];
  for (const token of tokens) {
    const response = await mockLogin(request({ my_token: token }));
    assert.equal(response.status, 400);
    assert.ok(!(await response.text()).includes(accessToken));
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.deepEqual(lookups, []);
});

test('missing or invalid signed shop claims are rejected before database access', async () => {
  for (const payload of [{}, { shop: 'example.com' }, { shop: '<script>alert(1)</script>' }]) {
    const response = await mockLogin(request({ my_token: createAppJwt(payload) }));
    assert.equal(response.status, 400);
    const body = await response.text();
    assert.ok(!body.includes(accessToken));
    assert.ok(!body.includes('<script>'));
  }
  assert.deepEqual(lookups, []);
});

test('normalizes the signed shop before looking up the installation', async () => {
  const response = await mockLogin(request({ my_token: createAppJwt({ shop: 'https://DEMO.myshopify.com/' }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(lookups, [shop]);
});

test('missing installation, missing token, and a different app client cannot expose credentials', async () => {
  for (const value of [null, { client_id: process.env.SHOPIFY_API_KEY }, { client_id: 'other-app', access_token: accessToken }]) {
    record = value;
    const response = await mockLogin(request({ my_token: createAppJwt({ shop }) }));
    assert.equal(response.status, 401);
    assert.ok(!(await response.text()).includes(accessToken));
  }
});

test('escapes database values instead of interpreting them as HTML', async () => {
  record.access_token = '<script>"token" & \'secret\'</script>';
  const response = await mockLogin(request({ my_token: createAppJwt({ shop }) }));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.ok(body.includes('&lt;script&gt;&quot;token&quot; &amp; &#39;secret&#39;&lt;/script&gt;'));
  assert.ok(!body.includes('<script>'));
});

test('session-token connector and POS printing display the stored Admin token and preserve CORS', async () => {
  const sessionToken = jwt.sign({ dest: `https://${shop}`, aud: process.env.SHOPIFY_API_KEY }, process.env.SHOPIFY_API_SECRET, { expiresIn: '60s' });
  for (const input of [request({ sessiontoken: sessionToken }), request({}, { Authorization: `Bearer ${sessionToken}` })]) {
    const response = await mockLogin(input);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.ok(body.includes(shop));
    assert.ok(body.includes(accessToken));
    assert.ok(body.includes('your access token stored'));
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(response.headers.get('Content-Disposition'), 'inline; filename="mocklogin.html"');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  }
  assert.deepEqual(lookups, [shop, shop]);
});

test('invalid, expired, future, and wrong-audience session tokens fail before database access', async () => {
  const payload = { dest: `https://${shop}`, aud: process.env.SHOPIFY_API_KEY };
  const tokens = [
    'invalid-token',
    jwt.sign(payload, process.env.SHOPIFY_API_SECRET, { expiresIn: -1 }),
    jwt.sign(payload, process.env.SHOPIFY_API_SECRET, { notBefore: '1h', expiresIn: '2h' }),
    jwt.sign({ ...payload, aud: 'other-app' }, process.env.SHOPIFY_API_SECRET, { expiresIn: '60s' }),
  ];
  for (const token of tokens) {
    const response = await mockLogin(request({ sessiontoken: token }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(!(await response.text()).includes(accessToken));
  }
  assert.deepEqual(lookups, []);
});
