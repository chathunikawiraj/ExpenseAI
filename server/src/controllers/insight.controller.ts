import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { insightService } from '../services/insight.service';
import { dbStore, DBInsight } from '../data/store';

export class InsightController {
  // GET /insights
  static async getInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const userInsights = dbStore.insights.filter((i) => i.userId === userId);
    userInsights.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.status(200).json(userInsights);
  }

  // POST /insights/generate (FR-30, FR-31, FR-32, FR-33)
  static async generate(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { period = new Date().toISOString().substring(0, 7) } = req.body;

    const { text, source } = await insightService.generateSpendingInsights(userId, period);

    const newInsight: DBInsight = {
      id: `ins_${Date.now()}`,
      userId,
      period,
      text,
      source,
      createdAt: new Date(),
    };

    dbStore.insights.push(newInsight);

    res.status(201).json({
      insight: newInsight,
      disclaimer: 'Informational only. Does not constitute professional financial advice (FR-33).',
    });
  }
}
