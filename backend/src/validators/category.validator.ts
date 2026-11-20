
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must contain at least 2 characters.')
    .max(80, 'Category name cannot exceed 80 characters.'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = CreateCategoryInput;
