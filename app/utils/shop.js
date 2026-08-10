export function getShopFromLocation() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("shop") || "";
}

export function getCurrentHost() {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

export function getQueryParam(key) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function getAdminFromShop(shop) {
  return `admin.shopify.com/store/${shop.replace(".myshopify.com", "")}`;
}

export function foldLongLine(line, max) {
  let tmp = line;
  let result = "";
  while (tmp.length > 0) {
    result += `${tmp.substring(0, max)}\n`;
    tmp = tmp.substring(max);
  }
  return result;
}
