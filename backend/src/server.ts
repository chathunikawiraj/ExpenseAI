
import "dotenv/config";
import app from "./app";
import prisma from "./config/database";
import { env } from "./config/env";
import { runReceiptCleanupCycle } from "./services/receipt-cleanup.service";

const RECEIPT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Connected to Neon PostgreSQL successfully!");

    const server = app.listen(env.PORT, () => {
      console.log(`ExpenseAI API running at http://localhost:${env.PORT}`);
    });

    let cleanupRunning = false;
    const cleanupReceipts = async () => {
      if (cleanupRunning) return;
      cleanupRunning = true;
      try {
        await runReceiptCleanupCycle();
      } catch (error) {
        console.error('[ExpenseAI receipt cleanup] Cleanup cycle failed:', error);
      } finally {
        cleanupRunning = false;
      }
    };
    const cleanupTimer = setInterval(() => {
      void cleanupReceipts();
    }, RECEIPT_CLEANUP_INTERVAL_MS);
    cleanupTimer.unref();
    void cleanupReceipts();

    const shutdown = (signal: string) => {
      console.log(`[ExpenseAI API] Received ${signal}; closing server`);
      clearInterval(cleanupTimer);
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
