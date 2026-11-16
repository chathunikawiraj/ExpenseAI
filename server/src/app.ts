import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import apiRouter from './routes';
import { swaggerDocument } from './docs/swagger';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';

export const app = express();

// Security HTTP headers (NFR-05, NFR-06)
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for local receipt uploads
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Swagger API Documentation (NFR-22)
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rate limiting
app.use('/api/v1', apiRateLimiter);

// API v1 Routes
app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Centralized error handling
app.use(errorHandler);
