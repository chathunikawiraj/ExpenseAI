import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).default('expenseai-development-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(32).default('expenseai-development-refresh-secret-change-me'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.string().optional().transform((value) => value === undefined ? undefined : value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error(`Invalid backend environment: ${parsedEnv.error.message}`);
}

const mailFields = [
  parsedEnv.data.SMTP_HOST,
  parsedEnv.data.SMTP_USER,
  parsedEnv.data.SMTP_PASS,
  parsedEnv.data.SMTP_FROM,
];
const mailConfiguredCount = mailFields.filter((value) => Boolean(value)).length;

if (mailConfiguredCount !== 0 && mailConfiguredCount !== mailFields.length) {
  throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM must all be configured together.');
}

if (parsedEnv.data.NODE_ENV === 'production' && (mailConfiguredCount !== mailFields.length ||
    parsedEnv.data.JWT_SECRET === 'expenseai-development-access-secret-change-me' ||
    parsedEnv.data.JWT_REFRESH_SECRET === 'expenseai-development-refresh-secret-change-me' ||
    parsedEnv.data.JWT_SECRET === parsedEnv.data.JWT_REFRESH_SECRET)) {
  throw new Error('Production requires SMTP configuration and two distinct non-default JWT secrets.');
}

export const env = parsedEnv.data;
