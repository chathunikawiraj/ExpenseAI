
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthError } from './auth.service';

export const getCategories = async (userId: string) => {
  return prisma.category.findMany({
    where: {
      OR: [
        { userId: null, isDefault: true },
        { userId, isDefault: false },
      ],
    },
    orderBy: {
      name: 'asc',
    },
  });
};

export const createCategory = async (userId: string, name: string) => {
  const normalizedName = name.trim();

  try {
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      throw new AuthError(
        'You already have a category with this name.',
        409,
        'CATEGORY_ALREADY_EXISTS'
      );
    }

    const defaultCategory = await prisma.category.findFirst({
      where: {
        userId: null,
        isDefault: true,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (defaultCategory) {
      throw new AuthError(
        'This category already exists as a default category.',
        409,
        'CATEGORY_ALREADY_EXISTS'
      );
    }

    return await prisma.category.create({
      data: {
        name: normalizedName,
        userId,
        isDefault: false,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AuthError(
        'You already have a category with this name.',
        409,
        'CATEGORY_ALREADY_EXISTS'
      );
    }

    throw error;
  }
};

export const updateCategory = async (
  userId: string,
  categoryId: string,
  name: string
) => {
  const normalizedName = name.trim();

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
      isDefault: false,
    },
  });

  if (!category) {
    throw new AuthError(
      'Category was not found or cannot be updated.',
      404,
      'CATEGORY_NOT_FOUND'
    );
  }

  const [existingCategory, defaultCategory] = await Promise.all([
    prisma.category.findFirst({
      where: {
        id: { not: categoryId },
        userId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    }),
    prisma.category.findFirst({
      where: {
        userId: null,
        isDefault: true,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    }),
  ]);

  if (existingCategory) {
    throw new AuthError(
      'You already have a category with this name.',
      409,
      'CATEGORY_ALREADY_EXISTS'
    );
  }

  if (defaultCategory) {
    throw new AuthError(
      'This category already exists as a default category.',
      409,
      'CATEGORY_ALREADY_EXISTS'
    );
  }

  try {
    return await prisma.category.update({
      where: { id: categoryId },
      data: { name: normalizedName },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AuthError(
        'You already have a category with this name.',
        409,
        'CATEGORY_ALREADY_EXISTS'
      );
    }

    throw error;
  }
};

export const deleteCategory = async (
  userId: string,
  categoryId: string
) => {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
      isDefault: false,
    },
  });

  if (!category) {
    throw new AuthError(
      'Category was not found or cannot be deleted.',
      404,
      'CATEGORY_NOT_FOUND'
    );
  }

  const [expenseCount, budgetCount] = await Promise.all([
    prisma.expense.count({
      where: { categoryId, userId },
    }),
    prisma.budget.count({
      where: { categoryId, userId },
    }),
  ]);

  if (expenseCount > 0 || budgetCount > 0) {
    throw new AuthError(
      'This category is currently used by expenses or budgets and cannot be deleted.',
      409,
      'CATEGORY_IN_USE'
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  return { message: 'Category deleted successfully.' };
};
