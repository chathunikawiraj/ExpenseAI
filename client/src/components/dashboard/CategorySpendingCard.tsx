import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { CardActionMenu } from '../common/CardActionMenu';
import { Category, CategoryBreakdown, Expense } from '../../types';

interface CategorySpendingCardProps {
  categories: Category[];
  expenses: Expense[];
  breakdown?: CategoryBreakdown | null;
}

export const CategorySpendingCard: React.FC<CategorySpendingCardProps> = ({ categories, expenses, breakdown }) => {
  const navigate = useNavigate();
  const categoryTotals = breakdown
    ? Object.fromEntries(breakdown.categories.map((item) => [item.categoryId, item.amount]))
    : expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.categoryId] = (totals[expense.categoryId] || 0) + expense.amount;
    return totals;
  }, {});
  const totalExpenses = Object.values(categoryTotals).reduce((total, amount) => total + amount, 0);
  const topCategories = Object.entries(categoryTotals)
    .map(([categoryId, amount]) => ({
      category: categories.find((item) => item.id === categoryId),
      categoryId,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return (
    <div className="card-hover bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-navy">Spending by Category</h3>
          <p className="text-xs text-navy-muted mt-0.5">
            {breakdown ? 'Database-backed category totals' : 'Categories in the latest loaded expenses'}
          </p>
        </div>
        <CardActionMenu
          label="Category spending actions"
          actions={[
            { label: 'Manage Budgets', onSelect: () => navigate('/budgets') },
            { label: 'View Transactions', onSelect: () => navigate('/transactions') },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        {topCategories.length > 0 ? (
          topCategories.map(({ category, categoryId, amount }) => {
            const color = category?.color || '#9275F5';
            const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
            return (
              <div
                key={categoryId}
                className="rounded-3xl bg-[#F8F9FE] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-navy">
                        {category?.name || 'Uncategorized'}
                      </h4>
                      <p className="text-[11px] text-navy-muted">
                        {percentage.toFixed(0)}% of tracked expenses
                      </p>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-sm font-extrabold text-navy">
                    ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 p-6 text-center text-xs text-navy-muted">
            No expenses to group by category yet.
          </div>
        )}
      </div>
    </div>
  );
};
