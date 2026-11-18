import rateLimit from 'express-rate-limit';

// Auth Rate Limiter (FR-01, FR-03, NFR-07): 5 attempts per minute per IP
export const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 5,
  message: { error: 'Too many authentication attempts from this IP. Please try again after 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
