
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),

  email: z.string()
    .trim()
    .email("Enter a valid email address")
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z.string()
    .min(8, "Password must contain at least 8 characters")
    .max(72, "Password cannot exceed 72 characters")
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, "Password is too long")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),

  currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
  monthlyIncome: z.number().finite().nonnegative().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

const emailSchema = z.string()
  .trim()
  .email("Enter a valid email address")
  .max(254)
  .transform((value) => value.toLowerCase());
const passwordSchema = z.string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password cannot exceed 72 characters")
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const emailOnlySchema = z.object({ email: emailSchema });
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters").max(100).optional(),
  email: emailSchema.optional(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).optional(),
  monthlyIncome: z.number().finite().nonnegative().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one profile field to update");
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export const verifyEmailSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) });
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  newPassword: passwordSchema,
});
