import jwt_decode from "jwt-decode";

export function _decodeSessionToken(sessionToken) {
    return jwt_decode(JSON.stringify(sessionToken));
}

export function _getShopFromQuery(window) {
    return new URLSearchParams(window.location.search).get("shop");
}

export function _getAdminFromShop(shop) {
    return `admin.shopify.com/store/${shop.replace('.myshopify.com', '')}`;
}

export function foldLongLine(line, max) {
    let tmp = line;
    let res = '';
    while (tmp.length > 0) {
        res += `${tmp.substring(0, max)}\n`;
        tmp = tmp.substring(max);
    }
    return res;
}
