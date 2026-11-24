import authRoutes from "./routes/auth.routes";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import categoryRoutes from './routes/category.routes';
import incomeRoutes from './routes/income.routes';
import expenseRoutes from './routes/expense.routes';
import transactionRoutes from './routes/transaction.routes';
import analyticsRoutes from './routes/analytics.routes';
import planningRoutes from './routes/planning.routes';
import notificationsRoutes from './routes/notifications.routes';
import insightsRoutes from './routes/insights.routes';
import receiptsRoutes from './routes/receipts.routes';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/v1/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1', planningRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/v1/insights', insightsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/v1/receipts', receiptsRoutes);
app.use('/api/receipts', receiptsRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "ExpenseAI API is running!",
    status: "success",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "ExpenseAI Backend",
  });
});

app.use(errorHandler);

export default app;
