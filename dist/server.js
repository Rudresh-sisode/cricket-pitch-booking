"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
const setup_1 = require("./sockets/setup");
const expiry_1 = require("./sockets/expiry");
async function start() {
    const server = http_1.default.createServer(app_1.app);
    (0, setup_1.setupSocket)(server);
    await (0, expiry_1.startReservationExpiryListener)();
    server.listen(env_1.env.port, () => {
        console.log(`Backend running on http://localhost:${env_1.env.port}`);
    });
    const shutdown = async () => {
        await prisma_1.prisma.$disconnect();
        server.close(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
start().catch(async (error) => {
    console.error("Failed to start server", error);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=server.js.map