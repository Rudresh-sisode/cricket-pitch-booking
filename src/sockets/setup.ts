import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { env } from "../config/env";
import { pitchDateRoom, setSocketServer } from "../config/socket";
import { redisPub, redisSub } from "../config/redis";

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendOrigin,
      credentials: true
    }
  });

  io.adapter(createAdapter(redisPub, redisSub));

  io.on("connection", (socket) => {
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
  });

  setSocketServer(io);
  return io;
}
