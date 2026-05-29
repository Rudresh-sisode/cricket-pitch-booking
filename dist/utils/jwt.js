"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.decodeTokenExpiry = decodeTokenExpiry;
exports.extractBearerToken = extractBearerToken;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function createAccessToken(user) {
    const jti = crypto_1.default.randomUUID();
    const payload = {
        sub: user.id,
        email: user.email,
        jti
    };
    const signOptions = {
        expiresIn: env_1.env.jwtExpiresIn
    };
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.jwtSecret, signOptions);
    return { token, jti };
}
function verifyAccessToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
    if (!decoded || typeof decoded !== "object") {
        throw new Error("Invalid token payload");
    }
    const payload = decoded;
    const userId = typeof payload.sub === "string" ? Number(payload.sub) : payload.sub;
    if (!userId || !payload.email || !payload.jti) {
        throw new Error("Invalid token payload");
    }
    return {
        id: userId,
        email: payload.email,
        jti: payload.jti
    };
}
function decodeTokenExpiry(token) {
    const decoded = jsonwebtoken_1.default.decode(token);
    return decoded?.exp ?? null;
}
function extractBearerToken(header) {
    if (!header) {
        return null;
    }
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return null;
    }
    return token;
}
//# sourceMappingURL=jwt.js.map