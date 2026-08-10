import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import jwtDecodeModule from 'jwt-decode';
import { API_SECRET } from './env.server.js';

const jwtDecode = jwtDecodeModule.default || jwtDecodeModule;

export function verifyShopifyHmac(params) {
  if (!API_SECRET) return false;
  const hmac = params.get('hmac');
  if (!hmac) return false;

  const message = [...params.entries()]
    .filter(([key]) => key !== 'hmac')
    .map(([key, value]) => `${encodeShopifyParam(key)}=${encodeShopifyParam(value)}`)
    .sort()
    .join('&');
  const computed = createHmac('sha256', API_SECRET).update(message).digest('hex');
  return safeEqual(computed, hmac);
}

export function verifyAppProxySignature(params) {
  if (!API_SECRET) return false;
  const signature = params.get('signature');
  if (!signature) return false;

  const message = [...params.entries()]
    .filter(([key]) => key !== 'signature')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('');
  const computed = createHmac('sha256', API_SECRET).update(message).digest('hex');
  return safeEqual(computed, signature);
}

export async function verifyWebhookHmac(request) {
  if (!API_SECRET) return false;
  const received = request.headers.get('x-shopify-hmac-sha256');
  if (!received) return false;
  const body = await request.text();
  const computed = createHmac('sha256', API_SECRET).update(body, 'utf8').digest('base64');
  return safeEqual(computed, received);
}

export function getIdFromShop(shop) {
  return normalizeShopDomain(shop).replace('.myshopify.com', '');
}

export function getAdminFromShop(shop) {
  return `admin.shopify.com/store/${getIdFromShop(shop)}`;
}

export function getShopFromSessionToken(token) {
  const payload = jwtDecode(token);
  return normalizeShopDomain(payload.dest || payload.input_data?.shop?.domain);
}

export function decodeSessionToken(token) {
  return jwtDecode(token);
}

export function verifySessionToken(token) {
  if (!token || !API_SECRET) return false;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return false;
  const digest = createHmac('sha256', API_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return safeEqual(digest, signature);
}

export function getBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
}

export function createAppJwt(payload) {
  return jwt.sign(payload, API_SECRET, { algorithm: 'HS256', expiresIn: '60s' });
}

export function decodeAppJwt(token) {
  return jwt.verify(token, API_SECRET);
}

export function contentSecurityPolicy(shop, embedded) {
  if (embedded) return `frame-ancestors https://${shop} https://admin.shopify.com;`;
  return "frame-ancestors 'none';";
}

export function isEmbedded(params) {
  return params.get('embedded') === '1';
}

export function normalizeShopDomain(value) {
  if (!value) return '';
  const host = String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(/[/?#]/)[0];
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) return '';
  return host;
}

function encodeShopifyParam(value) {
  return value.replace(/%/g, '%25').replace(/&/g, '%26');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
