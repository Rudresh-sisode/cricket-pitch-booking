"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReservationExpiryListener = startReservationExpiryListener;
const redis_1 = require("../config/redis");
const bookings_controller_1 = require("../controllers/bookings.controller");
const EXPIRED_EVENT_PATTERN = "__keyevent@*__:expired";
async function startReservationExpiryListener() {
    try {
        await redis_1.redisEvents.config("SET", "notify-keyspace-events", "Ex");
    }
    catch {
        // Managed Redis may block CONFIG SET; docker-compose already enables it.
    }
    await redis_1.redisEvents.psubscribe(EXPIRED_EVENT_PATTERN);
    redis_1.redisEvents.on("pmessage", async (_pattern, _channel, key) => {
        const parsed = (0, redis_1.parseReservationKey)(key);
        if (!parsed) {
            return;
        }
        await (0, bookings_controller_1.releaseFromExpiry)(parsed.pitchId, parsed.date, parsed.startTime);
    });
}
//# sourceMappingURL=expiry.js.map