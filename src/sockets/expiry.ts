import { redisEvents, parseReservationKey } from "../config/redis";
import { releaseFromExpiry } from "../controllers/bookings.controller";

const EXPIRED_EVENT_PATTERN = "__keyevent@*__:expired";

export async function startReservationExpiryListener() {
  try {
    await redisEvents.config("SET", "notify-keyspace-events", "Ex");
  } catch {
    // Managed Redis may block CONFIG SET; docker-compose already enables it.
  }

  await redisEvents.psubscribe(EXPIRED_EVENT_PATTERN);

  redisEvents.on("pmessage", async (_pattern, _channel, key) => {
    const parsed = parseReservationKey(key);
    if (!parsed) {
      return;
    }

    await releaseFromExpiry(parsed.pitchId, parsed.date, parsed.startTime);
  });
}
