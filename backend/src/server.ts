
import "dotenv/config";
import app from "./app";
import prisma from "./config/database";
import { env } from "./config/env";

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Connected to Neon PostgreSQL successfully!");

    const server = app.listen(env.PORT, () => {
      console.log(`ExpenseAI API running at http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`[ExpenseAI API] Received ${signal}; closing server`);
      server.close((error) => {
        if (error) console.error('[ExpenseAI API] Failed to close HTTP server:', error);
        void prisma.$disconnect().catch((disconnectError: unknown) => {
          console.error('[ExpenseAI API] Failed to disconnect from database:', disconnectError);
        });
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error("Failed to start ExpenseAI:", error);
    process.exit(1);
  }
}

startServer();
