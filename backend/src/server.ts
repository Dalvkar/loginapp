import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { PrismaAuthStore } from "./prisma-store.js";

const config = loadConfig();
const prisma = new PrismaClient();
const server = createApp({ store: new PrismaAuthStore(prisma), config }).listen(config.port, () => console.log(`API escuchando en el puerto ${config.port}`));
async function shutdown(signal: string) {
  console.log(`Cerrando servidor (${signal})`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
