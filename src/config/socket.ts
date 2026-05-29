import type { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function setSocketServer(server: SocketServer) {
  io = server;
}

export function pitchDateRoom(pitchId: number, date: string) {
  return `pitch:${pitchId}:${date}`;
}

export function emitSlotReserved(pitchId: number, date: string, startTime: string, userId: number) {
  io?.to(pitchDateRoom(pitchId, date)).emit("slot:reserved", {
    pitchId,
    date,
    startTime,
    userId
  });
}

export function emitSlotBooked(pitchId: number, date: string, startTime: string, bookingId: number, userId: number) {
  io?.to(pitchDateRoom(pitchId, date)).emit("slot:booked", {
    pitchId,
    date,
    startTime,
    bookingId,
    userId
  });
}

export function emitSlotReleased(pitchId: number, date: string, startTime: string) {
  io?.to(pitchDateRoom(pitchId, date)).emit("slot:released", {
    pitchId,
    date,
    startTime
  });
}
