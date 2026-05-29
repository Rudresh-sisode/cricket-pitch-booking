import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { env } from "../config/env";
import { emitSlotReleased, pitchDateRoom, setSocketServer } from "../config/socket";
import { redisPub, redisSub } from "../config/redis";
import { releaseReservationIfOwner } from "../services/booking.service";
import { verifyAccessToken } from "../utils/jwt";
import { isValidStartTime } from "../utils/slots";

type HoldRef = { pitchId: number; date: string; startTime: string };

function holdKey(ref: HoldRef) {
  return `${ref.pitchId}|${ref.date}|${ref.startTime}`;
}

function isHoldRef(value: unknown): value is HoldRef {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const ref = value as Record<string, unknown>;
  return (
    Number.isInteger(ref.pitchId) &&
    typeof ref.date === "string" &&
    ref.date.length > 0 &&
    typeof ref.startTime === "string" &&
    isValidStartTime(ref.startTime)
  );
}

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendOrigin,
      credentials: true
    }
  });

  io.adapter(createAdapter(redisPub, redisSub));

  // Optional auth: a valid token identifies the connection so we can release
  // only that user's holds on disconnect. Anonymous sockets may still view.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token === "string" && token.length > 0) {
      try {
        socket.data.userId = verifyAccessToken(token).id;
      } catch {
        // Invalid token → treat as anonymous; viewing is public.
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    const heldSlots = new Map<string, HoldRef>();

    socket.on("join-room", ({ pitchId, date }: { pitchId: number; date: string }) => {
      if (!Number.isInteger(pitchId) || !date) {
        return;
      }

      socket.join(pitchDateRoom(pitchId, date));
    });

    socket.on("leave-room", ({ pitchId, date }: { pitchId: number; date: string }) => {
      if (!Number.isInteger(pitchId) || !date) {
        return;
      }

      socket.leave(pitchDateRoom(pitchId, date));
    });

    // Client reports it now owns a hold (after a successful /reserve-slot).
    socket.on("hold:start", (ref: unknown) => {
      if (!isHoldRef(ref)) {
        return;
      }

      heldSlots.set(holdKey(ref), ref);
    });

    // Client reports the hold is no longer outstanding (confirmed/released).
    socket.on("hold:end", (ref: unknown) => {
      if (!isHoldRef(ref)) {
        return;
      }

      heldSlots.delete(holdKey(ref));
    });

    socket.on("disconnect", async () => {
      const userId = socket.data.userId as number | undefined;
      if (!userId || heldSlots.size === 0) {
        return;
      }

      for (const ref of heldSlots.values()) {
        try {
          const released = await releaseReservationIfOwner(userId, ref.pitchId, ref.date, ref.startTime);
          if (released) {
            emitSlotReleased(ref.pitchId, ref.date, ref.startTime);
          }
        } catch (error) {
          console.error("Failed to release hold on disconnect:", (error as Error).message);
        }
      }
    });
  });

  setSocketServer(io);
  return io;
}
