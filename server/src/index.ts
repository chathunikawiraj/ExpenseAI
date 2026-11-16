import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const startServer = async () => {
  await prisma.$connect();
  const server = app.listen(env.PORT, () => {
    console.log(`[ExpenseAI Server] Listening on http://localhost:${env.PORT}`);
    console.log(`[API Docs] Swagger available at http://localhost:${env.PORT}/api/v1/docs`);
  });

  const shutdown = (signal: string) => {
    console.log(`[ExpenseAI Server] Received ${signal}; closing server`);
    server.close((error) => {
      if (error) {
        console.error('[ExpenseAI Server] Failed to close HTTP server:', error);
        process.exitCode = 1;
      }

      void prisma.$disconnect().catch((disconnectError: unknown) => {
        console.error('[ExpenseAI Server] Failed to disconnect from database:', disconnectError);
        process.exitCode = 1;
      });
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return server;
};

void startServer().catch((error: unknown) => {
  console.error('[ExpenseAI Server] Failed to connect to database:', error);
  void prisma.$disconnect()
    .catch((disconnectError: unknown) => {
      console.error('[ExpenseAI Server] Failed to disconnect after startup error:', disconnectError);
    })
    .finally(() => {
      process.exitCode = 1;
    });
});
