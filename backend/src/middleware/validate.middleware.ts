import type { RequestHandler } from 'express';
import { z } from 'zod';

export const validateBody = (schema: z.ZodType): RequestHandler => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  req.body = parsed.data;
  next();
};
