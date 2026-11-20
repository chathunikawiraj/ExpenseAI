import type { ErrorRequestHandler } from 'express';
import { AuthError } from '../services/auth.service';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }

  console.error('[ExpenseAI API] Unhandled request error:', error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
};
