import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password cannot exceed 72 characters.')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include at least one letter and one number.');

const emailSchema = z.string().email().max(254);

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: passwordSchema,
    currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
    monthlyIncome: z.number().finite().nonnegative().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1).max(72),
  }),
});

export const emailSchemaBody = z.object({
  body: z.object({ email: emailSchema }),
});

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i),
    newPassword: passwordSchema,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: emailSchema.optional(),
    monthlyIncome: z.number().finite().nonnegative().optional(),
    currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
  }).refine((body) => Object.keys(body).length > 0, 'At least one profile field is required.'),
});
