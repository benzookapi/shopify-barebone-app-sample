import jwt_decode from "jwt-decode";
import { getAdminFromShop, getShopFromLocation } from "./shop.js";

export function useAppBridge() {
  return typeof window === "undefined" ? undefined : window.shopify;
}

export async function getSessionToken() {
  const shopify = useAppBridge();
  if (shopify?.idToken) return shopify.idToken();
  throw new Error("App Bridge idToken API is not available.");
}

export async function authenticatedFetch(url, options = {}) {
  const token = await getSessionToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function authenticatedJson(url, options = {}) {
  const response = await authenticatedFetch(url, options);
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "unknown content type";

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${text.slice(0, 1000)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON but received ${contentType}: ${text.slice(0, 1000)}`);
  }
}

function isAbsoluteHttpUrl(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function openBrowserTab(url) {
  const opened = window.open(url, "_blank");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // Some browsers restrict opener changes after navigation starts.
    }
    return;
  }
  return false;
}

async function openWithTarget(url, target) {
  const shopify = useAppBridge();
  if (target === "_top") {
    if (shopify?.open) {
      await shopify.open(url, "_top");
      return;
    }
    window.open(url, "_top");
    return;
  }
  if (target === "_blank") {
    if (openBrowserTab(url) !== false) return;
    if (shopify?.open) {
      await shopify.open(url, "_blank");
      return;
    }
    window.location.assign(url);
    return;
  }
  if (shopify?.open) {
    await shopify.open(url, target);
    return;
  }
  window.location.assign(url);
}

async function openEmbedded(url) {
  await openWithTarget(url, "_self");
}

export async function openRemote(url, newContext = false) {
  if (newContext || isAbsoluteHttpUrl(url)) {
    await openWithTarget(url, "_blank");
    return;
  }
  await openEmbedded(url);
}

export function navigateApp(path) {
  const target = new URL(path, window.location.origin);
  target.search = window.location.search;
  return openEmbedded(`${target.pathname}${target.search}${target.hash}`);
}

function toAdminProtocol(path) {
  if (!path.startsWith("/")) return path;
  return `shopify://admin${path}`;
}

export function navigateAdmin(path, newContext = false) {
  const shop = getShopFromLocation();
  const target = shop && path.startsWith("/")
    ? `https://${getAdminFromShop(shop)}${path}`
    : path;
  const adminTarget = toAdminProtocol(path);
  if (!newContext && adminTarget.startsWith("shopify://admin")) {
    return openWithTarget(adminTarget, "_top");
  }
  return openWithTarget(target, newContext ? "_blank" : "_top");
}

export function decodeSessionToken(sessionToken) {
  return jwt_decode(sessionToken);
}

export const RedirectAction = {
  APP: "APP",
  REMOTE: "REMOTE",
  ADMIN_PATH: "ADMIN_PATH",
};

export function createRedirect() {
  return {
    dispatch(action, payload) {
      if (action === RedirectAction.APP) {
        navigateApp(payload);
        return;
      }
      if (action === RedirectAction.REMOTE) {
        if (typeof payload === "string") {
          openRemote(payload);
        } else {
          openRemote(payload.url, Boolean(payload.newContext));
        }
        return;
      }
      if (action === RedirectAction.ADMIN_PATH) {
        const path = typeof payload === "string" ? payload : payload.path;
        navigateAdmin(path, Boolean(payload?.newContext));
      }
    },
  };
}
