export const dashboardQueryKeys = {
  financial: (userId: string) => ['dashboard', userId, 'financial'] as const,
  summary: (userId: string, month: string) =>
    ['dashboard', userId, 'financial', 'summary', month] as const,
  categoryBreakdown: (userId: string, month: string) =>
    ['dashboard', userId, 'financial', 'category-breakdown', month] as const,
  budgets: (userId: string) =>
    ['dashboard', userId, 'financial', 'budgets'] as const,
  budgetMonth: (userId: string, month: string) =>
    ['dashboard', userId, 'financial', 'budgets', month] as const,
  trends: (userId: string, months: number) =>
    ['dashboard', userId, 'financial', 'trends', months] as const,
  recentTransactions: (userId: string) =>
    ['dashboard', userId, 'financial', 'recent-transactions'] as const,
  incomeFallback: (userId: string) =>
    ['dashboard', userId, 'financial', 'income-fallback'] as const,
  expenseFallback: (userId: string) =>
    ['dashboard', userId, 'financial', 'expense-fallback'] as const,
  categories: (userId: string) =>
    ['dashboard', userId, 'category-metadata'] as const,
};
