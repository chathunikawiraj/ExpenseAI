import authRoutes from "./routes/auth.routes";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

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
