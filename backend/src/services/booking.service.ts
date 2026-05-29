import { BookingStatus, Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { redis, reservationKey } from "../config/redis";
import { ApiError } from "../middleware/error";
import { assertDateOnly, assertNotPastDate, dateRangeUtc, dateToUtcStart } from "../utils/date";
import { endTimeFromStart, isValidStartTime } from "../utils/slots";

function advisoryLockKey(pitchId: number, date: string, startTime: string) {
  const raw = `${pitchId}|${date}|${startTime}`;
  let hash = 0;

  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }

  return BigInt(hash);
}

async function ensurePitchExists(pitchId: number) {
  const pitch = await prisma.pitch.findUnique({
    where: { id: pitchId },
    select: { id: true }
  });

  if (!pitch) {
    throw new ApiError(404, "Pitch not found");
  }
}

export async function reserveSlot(userId: number, pitchId: number, date: string, startTime: string) {
  assertDateOnly(date);
  if (!isValidStartTime(startTime)) {
    throw new ApiError(400, "Invalid slot start time");
  }
  await ensurePitchExists(pitchId);

  const slotKey = reservationKey(pitchId, date, startTime);
  const { start, end } = dateRangeUtc(date);

  const existingBooking = await prisma.booking.findFirst({
    where: {
      pitchId,
      bookingDate: {
        gte: start,
        lt: end
      },
      startTime,
      status: BookingStatus.confirmed
    }
  });

  if (existingBooking) {
    throw new ApiError(409, "Slot is already booked");
  }

  const reservation = await redis.set(slotKey, String(userId), "EX", env.reservationTtlSeconds, "NX");

  if (!reservation) {
    const existingOwner = Number(await redis.get(slotKey));

    if (existingOwner === userId) {
      const ttl = await redis.ttl(slotKey);
      return {
        alreadyReserved: true,
        expiresInSeconds: ttl > 0 ? ttl : env.reservationTtlSeconds
      };
    }

    throw new ApiError(409, "Slot is currently reserved by another user");
  }

  return {
    alreadyReserved: false,
    expiresInSeconds: env.reservationTtlSeconds
  };
}

export async function confirmBooking(userId: number, pitchId: number, date: string, startTime: string) {
  assertDateOnly(date);
  if (!isValidStartTime(startTime)) {
    throw new ApiError(400, "Invalid slot start time");
  }
  await ensurePitchExists(pitchId);

  const slotKey = reservationKey(pitchId, date, startTime);
  const lockKey = advisoryLockKey(pitchId, date, startTime);

  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const { start, end } = dateRangeUtc(date);
    const existingBooking = await tx.booking.findFirst({
      where: {
        pitchId,
        bookingDate: {
          gte: start,
          lt: end
        },
        startTime,
        status: BookingStatus.confirmed
      }
    });

    if (existingBooking) {
      if (existingBooking.userId === userId) {
        return { booking: existingBooking, idempotent: true };
      }
      throw new ApiError(409, "Slot already booked");
    }

    const holdOwner = Number(await redis.get(slotKey));
    if (!Number.isInteger(holdOwner) || holdOwner !== userId) {
      throw new ApiError(410, "Reservation expired or owned by another user");
    }

    const booking = await tx.booking.create({
      data: {
        userId,
        pitchId,
        bookingDate: dateToUtcStart(date),
        startTime,
        endTime: endTimeFromStart(startTime),
        status: BookingStatus.confirmed
      }
    });

    return { booking, idempotent: false };
  });

  await redis.del(slotKey);

  return created;
}

// Atomically delete a reservation hold only if it is still owned by `userId`.
// Returns true if a hold was actually released. Guards against releasing a hold
// that already expired and was re-acquired by a different user.
const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0`;

export async function releaseReservationIfOwner(
  userId: number,
  pitchId: number,
  date: string,
  startTime: string
): Promise<boolean> {
  if (!isValidStartTime(startTime)) {
    return false;
  }

  const slotKey = reservationKey(pitchId, date, startTime);
  const released = await redis.eval(RELEASE_IF_OWNER_SCRIPT, 1, slotKey, String(userId));
  return Number(released) === 1;
}

export async function getMyBookings(userId: number) {
  return prisma.booking.findMany({
    where: { userId },
    include: {
      pitch: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function parseAndValidateBookingInput(input: {
  pitchId: unknown;
  date: unknown;
  startTime: unknown;
}) {
  const pitchId = Number(input.pitchId);
  const date = String(input.date);
  const startTime = String(input.startTime);

  if (!Number.isInteger(pitchId) || pitchId <= 0) {
    throw new ApiError(400, "pitchId must be a positive integer");
  }

  try {
    assertDateOnly(date);
  } catch {
    throw new ApiError(400, "Date must be in YYYY-MM-DD format");
  }

  try {
    assertNotPastDate(date);
  } catch {
    throw new ApiError(400, "Past dates are not allowed");
  }

  if (!isValidStartTime(startTime)) {
    throw new ApiError(400, "Invalid slot start time");
  }

  return { pitchId, date, startTime };
}

export function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new ApiError(409, "Slot already booked");
  }

  return error;
}
