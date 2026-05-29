import Redis from "ioredis";
import { env } from "./env";

function createClient() {
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });

  client.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  return client;
}

export const redis = createClient();
export const redisPub = createClient();
export const redisSub = createClient();
export const redisEvents = createClient();

function encodeStartTime(startTime: string) {
  return startTime.replace(":", "-");
}

function decodeStartTime(value: string) {
  const decoded = value.replace("-", ":");
  return /^\d{2}:\d{2}$/.test(decoded) ? decoded : null;
}

export function reservationKey(pitchId: number, date: string, startTime: string) {
  return `reserve:${pitchId}:${date}:${encodeStartTime(startTime)}`;
}

export function reservationPattern(pitchId: number, date: string) {
  return `reserve:${pitchId}:${date}:*`;
}

export function parseReservationKey(key: string) {
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
