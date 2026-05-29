import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { setupSocket } from "./sockets/setup";
import { startReservationExpiryListener } from "./sockets/expiry";

async function start() {
  const server = http.createServer(app);

  setupSocket(server);
  await startReservationExpiryListener();

  server.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(async (error) => {
  console.error("Failed to start server", error);
  await prisma.$disconnect();
  process.exit(1);
});
