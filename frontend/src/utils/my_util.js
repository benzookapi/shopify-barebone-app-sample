import jwt_decode from "jwt-decode";

export function _decodeSessionToken(sessionToken) {
    return jwt_decode(JSON.stringify(sessionToken));
}

