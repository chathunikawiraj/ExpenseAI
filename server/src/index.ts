import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[ExpenseAI Server] Listening on http://localhost:${env.PORT}`);
  console.log(`[API Docs] Swagger available at http://localhost:${env.PORT}/api/v1/docs`);
});

export default server;
