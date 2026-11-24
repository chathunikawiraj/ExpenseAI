import type { RequestHandler } from 'express';
import { getAnalyticsSummary } from '../services/analytics.service';
import { analyticsSummaryQuerySchema } from '../validators/analytics.validator';
import {
  analyticsDateRangeQuerySchema,
  analyticsTrendsQuerySchema,
} from '../validators/analytics.validator';
import {
  getCategoryBreakdown,
  getAnalyticsTrends,
} from '../services/analytics.service';

export const getSummary: RequestHandler = async (req, res) => {
  const parsedQuery = analyticsSummaryQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const summary = await getAnalyticsSummary(
    req.authUser!.userId,
    parsedQuery.data
  );
  res.status(200).json(summary);
};

export const getCategoryBreakdownData: RequestHandler = async (req, res) => {
  const parsedQuery = analyticsDateRangeQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const breakdown = await getCategoryBreakdown(
    req.authUser!.userId,
    parsedQuery.data
  );
  res.status(200).json(breakdown);
};

export const getTrends: RequestHandler = async (req, res) => {
  const parsedQuery = analyticsTrendsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: 'Validation failed.',
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const trends = await getAnalyticsTrends(
    req.authUser!.userId,
    parsedQuery.data
  );
  res.status(200).json(trends);
};
