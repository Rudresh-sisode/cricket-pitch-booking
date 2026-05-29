"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisEvents = exports.redisSub = exports.redisPub = exports.redis = void 0;
exports.reservationKey = reservationKey;
exports.reservationPattern = reservationPattern;
exports.parseReservationKey = parseReservationKey;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
function createClient() {
    const client = new ioredis_1.default(env_1.env.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true
    });
    client.on("error", (error) => {
        console.error("Redis error:", error.message);
    });
    return client;
}
exports.redis = createClient();
exports.redisPub = createClient();
exports.redisSub = createClient();
exports.redisEvents = createClient();
function encodeStartTime(startTime) {
    return startTime.replace(":", "-");
}
function decodeStartTime(value) {
    const decoded = value.replace("-", ":");
    return /^\d{2}:\d{2}$/.test(decoded) ? decoded : null;
}
function reservationKey(pitchId, date, startTime) {
    return `reserve:${pitchId}:${date}:${encodeStartTime(startTime)}`;
}
function reservationPattern(pitchId, date) {
    return `reserve:${pitchId}:${date}:*`;
}
function parseReservationKey(key) {
    const parts = key.split(":");
    if (parts.length !== 4 || parts[0] !== "reserve") {
        return null;
    }
    const pitchId = Number(parts[1]);
    const date = parts[2];
    const startTime = decodeStartTime(parts[3]);
    if (!Number.isInteger(pitchId) || !date || !startTime) {
        return null;
    }
    return { pitchId, date, startTime };
}
//# sourceMappingURL=redis.js.map