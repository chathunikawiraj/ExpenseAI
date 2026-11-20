
import type { RequestHandler } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/category.service';

export const listCategories: RequestHandler = async (req, res) => {
  const categories = await getCategories(req.authUser!.userId);

  res.status(200).json({
    status: 'success',
    data: { categories },
  });
};

export const addCategory: RequestHandler = async (req, res) => {
  const category = await createCategory(
    req.authUser!.userId,
    req.body.name
  );

  res.status(201).json({
    status: 'success',
    message: 'Category created successfully.',
    data: { category },
  });
};

export const editCategory: RequestHandler = async (req, res) => {
  const category = await updateCategory(
    req.authUser!.userId,
    req.params.id as string,
    req.body.name
  );

  res.status(200).json({
    status: 'success',
    message: 'Category updated successfully.',
    data: { category },
  });
};

export const removeCategory: RequestHandler = async (req, res) => {
  const result = await deleteCategory(
    req.authUser!.userId,
    req.params.id as string
  );

  res.status(200).json({
    status: 'success',
    ...result,
  });
};
