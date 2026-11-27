import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { CardActionMenu } from '../common/CardActionMenu';
import { Category, CategoryBreakdown } from '../../types';
import { EmptyState, Skeleton } from '../common/EmptyState';
import { formatCurrency } from '../../utils/formatCurrency';

interface CategorySpendingCardProps {
  categories: Category[];
  breakdown?: CategoryBreakdown | null;
  currency: string;
  isLoading?: boolean;
  error?: string | null;
}

export const CategorySpendingCard: React.FC<CategorySpendingCardProps> = ({
  categories,
  breakdown,
  currency,
  isLoading = false,
  error,
}) => {
  const navigate = useNavigate();
  const topCategories = (breakdown?.categories ?? []).slice(0, 3);

  return (
    <div className="card-hover bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-navy">Spending by Category</h3>
          <p className="text-xs text-navy-muted mt-0.5">
            Selected-month spending
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
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : error ? (
          <p role="alert" className="rounded-3xl border border-dashed border-gray-200 p-6 text-center text-xs text-navy-muted">
            Category spending could not be loaded.
          </p>
        ) : breakdown && breakdown.totalExpenses > 0 && topCategories.length > 0 ? (
          topCategories.map((item) => {
            const category = categories.find((entry) => entry.id === item.categoryId);
            const color = category?.color || '#9275F5';
            const percentage = Math.max(0, Math.min(item.percentage, 100));
            return (
              <div
                key={item.categoryId}
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
                        {item.name || category?.name || 'Uncategorized'}
                      </h4>
                      <p className="text-[11px] text-navy-muted">
                        {item.percentage.toFixed(1)}% of selected-month expenses
                      </p>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-sm font-extrabold text-navy">
                    {formatCurrency(item.amount, currency)}
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
          <EmptyState
            icon={Tag}
            title="No expenses this month"
            description="Category spending will appear here after you record an expense."
          />
        )}
      </div>
    </div>
  );
};
