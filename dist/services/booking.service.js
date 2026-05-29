"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserveSlot = reserveSlot;
exports.confirmBooking = confirmBooking;
exports.getMyBookings = getMyBookings;
exports.parseAndValidateBookingInput = parseAndValidateBookingInput;
exports.mapPrismaError = mapPrismaError;
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const redis_1 = require("../config/redis");
const error_1 = require("../middleware/error");
const date_1 = require("../utils/date");
const slots_1 = require("../utils/slots");
function advisoryLockKey(pitchId, date, startTime) {
    const raw = `${pitchId}|${date}|${startTime}`;
    let hash = 0;
    for (let index = 0; index < raw.length; index += 1) {
        hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
    }
    return BigInt(hash);
}
async function ensurePitchExists(pitchId) {
    const pitch = await prisma_1.prisma.pitch.findUnique({
        where: { id: pitchId },
        select: { id: true }
    });
    if (!pitch) {
        throw new error_1.ApiError(404, "Pitch not found");
    }
}
async function reserveSlot(userId, pitchId, date, startTime) {
    (0, date_1.assertDateOnly)(date);
    if (!(0, slots_1.isValidStartTime)(startTime)) {
        throw new error_1.ApiError(400, "Invalid slot start time");
    }
    await ensurePitchExists(pitchId);
    const slotKey = (0, redis_1.reservationKey)(pitchId, date, startTime);
    const { start, end } = (0, date_1.dateRangeUtc)(date);
    const existingBooking = await prisma_1.prisma.booking.findFirst({
        where: {
            pitchId,
            bookingDate: {
                gte: start,
                lt: end
            },
            startTime,
            status: client_1.BookingStatus.confirmed
        }
    });
    if (existingBooking) {
        throw new error_1.ApiError(409, "Slot is already booked");
    }
    const reservation = await redis_1.redis.set(slotKey, String(userId), "EX", env_1.env.reservationTtlSeconds, "NX");
    if (!reservation) {
        const existingOwner = Number(await redis_1.redis.get(slotKey));
        if (existingOwner === userId) {
            const ttl = await redis_1.redis.ttl(slotKey);
            return {
                alreadyReserved: true,
                expiresInSeconds: ttl > 0 ? ttl : env_1.env.reservationTtlSeconds
            };
        }
        throw new error_1.ApiError(409, "Slot is currently reserved by another user");
    }
    return {
        alreadyReserved: false,
        expiresInSeconds: env_1.env.reservationTtlSeconds
    };
}
async function confirmBooking(userId, pitchId, date, startTime) {
    (0, date_1.assertDateOnly)(date);
    if (!(0, slots_1.isValidStartTime)(startTime)) {
        throw new error_1.ApiError(400, "Invalid slot start time");
    }
    await ensurePitchExists(pitchId);
    const slotKey = (0, redis_1.reservationKey)(pitchId, date, startTime);
    const lockKey = advisoryLockKey(pitchId, date, startTime);
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(${lockKey})`;
        const { start, end } = (0, date_1.dateRangeUtc)(date);
        const existingBooking = await tx.booking.findFirst({
            where: {
                pitchId,
                bookingDate: {
                    gte: start,
                    lt: end
                },
                startTime,
                status: client_1.BookingStatus.confirmed
            }
        });
        if (existingBooking) {
            if (existingBooking.userId === userId) {
                return { booking: existingBooking, idempotent: true };
            }
            throw new error_1.ApiError(409, "Slot already booked");
        }
        const holdOwner = Number(await redis_1.redis.get(slotKey));
        if (!Number.isInteger(holdOwner) || holdOwner !== userId) {
            throw new error_1.ApiError(410, "Reservation expired or owned by another user");
        }
        const booking = await tx.booking.create({
            data: {
                userId,
                pitchId,
                bookingDate: (0, date_1.dateToUtcStart)(date),
                startTime,
                endTime: (0, slots_1.endTimeFromStart)(startTime),
                status: client_1.BookingStatus.confirmed
            }
        });
        return { booking, idempotent: false };
    });
    await redis_1.redis.del(slotKey);
    return created;
}
async function getMyBookings(userId) {
    return prisma_1.prisma.booking.findMany({
        where: { userId },
        include: {
            pitch: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });
}
async function parseAndValidateBookingInput(input) {
    const pitchId = Number(input.pitchId);
    const date = String(input.date);
    const startTime = String(input.startTime);
    if (!Number.isInteger(pitchId) || pitchId <= 0) {
        throw new error_1.ApiError(400, "pitchId must be a positive integer");
    }
    try {
        (0, date_1.assertDateOnly)(date);
    }
    catch {
        throw new error_1.ApiError(400, "Date must be in YYYY-MM-DD format");
    }
    try {
        (0, date_1.assertNotPastDate)(date);
    }
    catch {
        throw new error_1.ApiError(400, "Past dates are not allowed");
    }
    if (!(0, slots_1.isValidStartTime)(startTime)) {
        throw new error_1.ApiError(400, "Invalid slot start time");
    }
    return { pitchId, date, startTime };
}
function mapPrismaError(error) {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return new error_1.ApiError(409, "Slot already booked");
    }
    return error;
}
//# sourceMappingURL=booking.service.js.map