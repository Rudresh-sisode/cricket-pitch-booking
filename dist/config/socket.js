"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocketServer = setSocketServer;
exports.pitchDateRoom = pitchDateRoom;
exports.emitSlotReserved = emitSlotReserved;
exports.emitSlotBooked = emitSlotBooked;
exports.emitSlotReleased = emitSlotReleased;
let io = null;
function setSocketServer(server) {
    io = server;
}
function pitchDateRoom(pitchId, date) {
    return `pitch:${pitchId}:${date}`;
}
function emitSlotReserved(pitchId, date, startTime, userId) {
    io?.to(pitchDateRoom(pitchId, date)).emit("slot:reserved", {
        pitchId,
        date,
        startTime,
        userId
    });
}
function emitSlotBooked(pitchId, date, startTime, bookingId, userId) {
    io?.to(pitchDateRoom(pitchId, date)).emit("slot:booked", {
        pitchId,
        date,
        startTime,
        bookingId,
        userId
    });
}
function emitSlotReleased(pitchId, date, startTime) {
    io?.to(pitchDateRoom(pitchId, date)).emit("slot:released", {
        pitchId,
        date,
        startTime
    });
}
//# sourceMappingURL=socket.js.map