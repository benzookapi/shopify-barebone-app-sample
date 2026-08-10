import { APP_URL } from './env.server.js';

export function getPublicOrigin(request) {
  if (APP_URL) return new URL(APP_URL).origin;

  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host') || url.host;
  const fallbackProtocol = isLocalHost(host) ? url.protocol.replace(':', '') : 'https';
  const protocol = forwardedProto || fallbackProtocol || 'https';
  return `${protocol}://${host}`.replace(/\/$/, '');
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
}
