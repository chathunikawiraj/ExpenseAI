import { env } from '../config/env';
import { dbStore } from '../data/store';

export interface InsightService {
  generateSpendingInsights(userId: string, period: string): Promise<{ text: string; source: 'AI' | 'RULE' }>;
}

export class HybridInsightService implements InsightService {
  async generateSpendingInsights(userId: string, period: string): Promise<{ text: string; source: 'AI' | 'RULE' }> {
    // 1. Compute strictly aggregated financial numbers (Zero PII - FR-31)
    const monthExpenses = dbStore.expenses.filter(
      (e) => e.userId === userId && e.date.toISOString().substring(0, 7) === period
    );

    const totalSpent = monthExpenses.reduce((sum, curr) => sum + curr.amount, 0);

    // Group by category
    const categoryTotals: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      const cat = dbStore.categories.find((c) => c.id === e.categoryId);
      const name = cat?.name || 'Other';
      categoryTotals[name] = (categoryTotals[name] || 0) + e.amount;
    });

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topCatName = topCategoryEntry ? topCategoryEntry[0] : 'None';
    const topCatAmount = topCategoryEntry ? topCategoryEntry[1] : 0;
    const topCatShare = totalSpent > 0 ? Math.round((topCatAmount / totalSpent) * 100) : 0;

    // 2. If OpenAI key is present, pass ONLY aggregated statistics
    if (env.OPENAI_API_KEY) {
      try {
        const prompt = `Analyze this personal finance spending summary:
Month: ${period}
Total Outflow: $${totalSpent.toFixed(2)}
Top Category: ${topCatName} ($${topCatAmount.toFixed(2)}, ${topCatShare}% of total)
Provide exactly ONE concise, actionable, and encouraging financial insight sentence. Do not mention names.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 80,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            return { text, source: 'AI' };
          }
        }
      } catch (err) {
        console.warn('[AI Insight] OpenAI API error, using algorithmic fallback (FR-32):', err);
      }
    }

    // 3. Algorithmic Rule-Based Fallback Engine (FR-32)
    let fallbackText = '';
    if (topCatShare >= 50) {
      fallbackText = `${topCatName} represents ${topCatShare}% ($${topCatAmount.toFixed(2)}) of your total spending for ${period}. Reviewing recurring charges here could generate immediate savings.`;
    } else if (totalSpent > 0) {
      fallbackText = `Your monthly spending is well balanced across categories, with ${topCatName} being the largest portion at ${topCatShare}%.`;
    } else {
      fallbackText = `No transactions recorded yet for ${period}. Set a monthly budget to begin tracking your financial health.`;
    }

    return { text: fallbackText, source: 'RULE' };
  }
}

export const insightService = new HybridInsightService();
