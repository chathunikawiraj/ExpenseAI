import type { RequestHandler } from 'express';
import { generateInsight, listInsights } from '../services/insights.service';

export const getInsights: RequestHandler = async (req, res) => {
  res.status(200).json(await listInsights(req.authUser!.userId));
};

export const generateInsights: RequestHandler = async (req, res) => {
  const period = typeof req.body?.period === 'string'
    ? req.body.period
    : undefined;
  if (period && !/^\d{4}-\d{2}$/.test(period)) {
    res.status(400).json({ error: 'Period must use YYYY-MM format.' });
    return;
  }
  const insight = await generateInsight(req.authUser!.userId, period);
  res.status(201).json({
    insight,
    disclaimer: 'These rule-based insights are informational and not financial advice.',
  });
};
