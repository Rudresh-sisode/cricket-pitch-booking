"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const redis_1 = require("../config/redis");
const error_1 = require("./error");
const jwt_1 = require("../utils/jwt");
async function requireAuth(req, _res, next) {
    try {
        const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
        if (!token) {
            throw new error_1.ApiError(401, "Missing bearer token");
        }
        const user = (0, jwt_1.verifyAccessToken)(token);
        const isBlacklisted = await redis_1.redis.exists(`auth:blacklist:${user.jti}`);
        if (isBlacklisted) {
            throw new error_1.ApiError(401, "Token has been logged out");
        }
        req.user = user;
        req.token = token;
        next();
    }
    catch (error) {
        if (error instanceof error_1.ApiError) {
            return next(error);
        }
        return next(new error_1.ApiError(401, "Invalid or expired token"));
    }
}
//# sourceMappingURL=auth.js.map