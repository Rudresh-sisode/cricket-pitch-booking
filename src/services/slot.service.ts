import { BookingStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { dateRangeUtc } from "../utils/date";
import { createHourlySlots } from "../utils/slots";
import { parseReservationKey, redis, reservationPattern } from "../config/redis";

type SlotState = "available" | "booked" | "reserved";

export type SlotWithStatus = {
  startTime: string;
  endTime: string;
  status: SlotState;
  reservedByUserId: number | null;
  reservedTtlSeconds: number | null;
};

async function readReservedSlotMap(pitchId: number, date: string) {
  const reserved = new Map<string, { userId: number; ttlSeconds: number }>();
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", reservationPattern(pitchId, date), "COUNT", 200);
    cursor = nextCursor;

    if (keys.length > 0) {
      const values = await redis.mget(...keys);
      const ttls = await Promise.all(keys.map((key) => redis.ttl(key)));

      keys.forEach((key, index) => {
        const parsed = parseReservationKey(key);
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

export async function getSlotsForPitchDate(pitchId: number, date: string): Promise<SlotWithStatus[]> {
  const { start, end } = dateRangeUtc(date);

  const [bookings, reservedMap] = await Promise.all([
    prisma.booking.findMany({
      where: {
        pitchId,
        bookingDate: {
          gte: start,
          lt: end
        },
        status: BookingStatus.confirmed
      },
      select: {
        startTime: true
      }
    }),
    readReservedSlotMap(pitchId, date)
  ]);

  const booked = new Set(bookings.map((booking) => booking.startTime));

  return createHourlySlots().map((slot) => {
    if (booked.has(slot.startTime)) {
      return {
        ...slot,
        status: "booked" as const,
        reservedByUserId: null,
        reservedTtlSeconds: null
      };
    }

    const reserved = reservedMap.get(slot.startTime);
    if (reserved) {
      return {
        ...slot,
        status: "reserved" as const,
        reservedByUserId: reserved.userId,
        reservedTtlSeconds: reserved.ttlSeconds
      };
    }

    return {
      ...slot,
      status: "available" as const,
      reservedByUserId: null,
      reservedTtlSeconds: null
    };
  });
}
