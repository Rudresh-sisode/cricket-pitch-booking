"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function asNumber(name, fallback) {
    const value = process.env[name];
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid numeric value for ${name}: ${value}`);
    }
    return parsed;
}
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: asNumber("PORT", 4000),
    databaseUrl: required("DATABASE_URL"),
    redisUrl: required("REDIS_URL"),
    jwtSecret: required("JWT_SECRET"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    reservationTtlSeconds: asNumber("RESERVATION_TTL_SECONDS", 120)
};
//# sourceMappingURL=env.js.map