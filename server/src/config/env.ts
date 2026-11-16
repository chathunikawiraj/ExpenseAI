import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/expenseai?schema=public'),
  JWT_SECRET: z.string().default('supersecret_jwt_access_token_key_for_expenseai_32chars'),
  JWT_REFRESH_SECRET: z.string().default('supersecret_jwt_refresh_token_key_for_expenseai_32chars'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
