"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlotsForPitchDate = getSlotsForPitchDate;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const date_1 = require("../utils/date");
const slots_1 = require("../utils/slots");
const redis_1 = require("../config/redis");
async function readReservedSlotMap(pitchId, date) {
    const reserved = new Map();
    let cursor = "0";
    do {
        const [nextCursor, keys] = await redis_1.redis.scan(cursor, "MATCH", (0, redis_1.reservationPattern)(pitchId, date), "COUNT", 200);
        cursor = nextCursor;
        if (keys.length > 0) {
            const values = await redis_1.redis.mget(...keys);
            const ttls = await Promise.all(keys.map((key) => redis_1.redis.ttl(key)));
            keys.forEach((key, index) => {
                const parsed = (0, redis_1.parseReservationKey)(key);
                const startTime = parsed?.startTime;
                const owner = values[index];
                const userId = owner && /^\d+$/.test(owner) ? Number(owner) : null;
                const ttlSeconds = ttls[index];
                if (startTime && userId && ttlSeconds > 0) {
                    reserved.set(startTime, { userId, ttlSeconds });
                }
            });
        }
    } while (cursor !== "0");
    return reserved;
}
async function getSlotsForPitchDate(pitchId, date) {
    const { start, end } = (0, date_1.dateRangeUtc)(date);
    const [bookings, reservedMap] = await Promise.all([
        prisma_1.prisma.booking.findMany({
            where: {
                pitchId,
                bookingDate: {
                    gte: start,
                    lt: end
                },
                status: client_1.BookingStatus.confirmed
            },
            select: {
                startTime: true
            }
        }),
        readReservedSlotMap(pitchId, date)
    ]);
    const booked = new Set(bookings.map((booking) => booking.startTime));
    return (0, slots_1.createHourlySlots)().map((slot) => {
        if (booked.has(slot.startTime)) {
            return {
                ...slot,
                status: "booked",
                reservedByUserId: null,
                reservedTtlSeconds: null
            };
        }
        const reserved = reservedMap.get(slot.startTime);
        if (reserved) {
            return {
                ...slot,
                status: "reserved",
                reservedByUserId: reserved.userId,
                reservedTtlSeconds: reserved.ttlSeconds
            };
        }
        return {
            ...slot,
            status: "available",
            reservedByUserId: null,
            reservedTtlSeconds: null
        };
    });
}
//# sourceMappingURL=slot.service.js.map