"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const socket_1 = require("../config/socket");
const redis_1 = require("../config/redis");
function setupSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_1.env.frontendOrigin,
            credentials: true
        }
    });
    io.adapter((0, redis_adapter_1.createAdapter)(redis_1.redisPub, redis_1.redisSub));
    io.on("connection", (socket) => {
        socket.on("join-room", ({ pitchId, date }) => {
            if (!Number.isInteger(pitchId) || !date) {
                return;
            }
            socket.join((0, socket_1.pitchDateRoom)(pitchId, date));
        });
        socket.on("leave-room", ({ pitchId, date }) => {
            if (!Number.isInteger(pitchId) || !date) {
                return;
            }
            socket.leave((0, socket_1.pitchDateRoom)(pitchId, date));
        });
    });
    (0, socket_1.setSocketServer)(io);
    return io;
}
//# sourceMappingURL=setup.js.map