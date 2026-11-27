import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { SpendingTrendChart } from '../components/dashboard/SpendingTrendChart';
import { CategorySpendingCard } from '../components/dashboard/CategorySpendingCard';
import { RightPanelSummary } from '../components/dashboard/RightPanelSummary';
import { BudgetProgress } from '../components/common/BudgetProgress';
import { ResourceStatus } from '../components/common/ResourceStatus';
import { Skeleton } from '../components/common/EmptyState';
import { analyticsApi, budgetsApi, transactionsApi } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { dashboardQueryKeys } from '../services/dashboardQueryKeys';

const currentLocalMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const monthDateRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
};

const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : 'The server request failed.';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryUserId = userId ?? '';
  const currency = user?.currency || 'LKR';
  const [selectedMonth, setSelectedMonth] = useState(currentLocalMonth);
  const queryClient = useQueryClient();
  const { startDate, endDate } = monthDateRange(selectedMonth);

  const summaryQuery = useQuery({
    queryKey: dashboardQueryKeys.summary(queryUserId, selectedMonth),
    queryFn: () => analyticsApi.getSummary(selectedMonth),
    enabled: Boolean(userId),
  });
  const categoryBreakdownQuery = useQuery({
    queryKey: dashboardQueryKeys.categoryBreakdown(queryUserId, selectedMonth),
    queryFn: () => analyticsApi.getCategoryBreakdown(startDate, endDate),
    enabled: Boolean(userId),
  });
  const budgetsQuery = useQuery({
    queryKey: dashboardQueryKeys.budgetMonth(queryUserId, selectedMonth),
    queryFn: () => budgetsApi.getBudgets(selectedMonth),
    enabled: Boolean(userId),
  });
  const trendsQuery = useQuery({
    queryKey: dashboardQueryKeys.trends(queryUserId, 12),
    queryFn: () => analyticsApi.getTrends(12),
    enabled: Boolean(userId),
  });
  const recentTransactionsQuery = useQuery({
    queryKey: dashboardQueryKeys.recentTransactions(queryUserId),
    queryFn: () => transactionsApi.getTransactions({
      page: 1,
      limit: 20,
      sortBy: 'date',
      order: 'desc',
    }),
    enabled: Boolean(userId),
  });
  const categoriesQuery = useQuery({
    queryKey: dashboardQueryKeys.categories(queryUserId),
    queryFn: () => transactionsApi.getCategories(),
    enabled: Boolean(userId),
  });
  const incomeFallbackQuery = useQuery({
    queryKey: dashboardQueryKeys.incomeFallback(queryUserId),
    queryFn: () => transactionsApi.getIncomes({
      page: 1,
      limit: 20,
      sortBy: 'date',
      order: 'desc',
    }),
    enabled: Boolean(userId) && trendsQuery.isError,
  });
  const expenseFallbackQuery = useQuery({
    queryKey: dashboardQueryKeys.expenseFallback(queryUserId),
    queryFn: () => transactionsApi.getExpenses({
      page: 1,
      limit: 20,
      sortBy: 'date',
      order: 'desc',
    }),
    enabled: Boolean(userId) && trendsQuery.isError,
  });

  const summary = summaryQuery.isError ? null : summaryQuery.data ?? null;
  const breakdown = categoryBreakdownQuery.isError ? null : categoryBreakdownQuery.data ?? null;
  const budgets = budgetsQuery.isError ? null : budgetsQuery.data ?? null;
  const categories = categoriesQuery.isError ? [] : categoriesQuery.data ?? [];
  const recentTransactions = recentTransactionsQuery.isError
    ? []
    : recentTransactionsQuery.data?.data ?? [];
  const trends = trendsQuery.isError ? null : trendsQuery.data ?? null;
  const incomes = incomeFallbackQuery.isError ? [] : incomeFallbackQuery.data?.data ?? [];
  const expenses = expenseFallbackQuery.isError ? [] : expenseFallbackQuery.data?.data ?? [];
  const isPeriodLoading =
    summaryQuery.isLoading || categoryBreakdownQuery.isLoading || budgetsQuery.isLoading;
  const isSupportingLoading =
    trendsQuery.isLoading ||
    recentTransactionsQuery.isLoading ||
    categoriesQuery.isLoading ||
    incomeFallbackQuery.isLoading ||
    expenseFallbackQuery.isLoading;
  const isLoading = isPeriodLoading || isSupportingLoading;
  const errors = [
    ...(summaryQuery.isError ? [`Monthly summary: ${errorMessage(summaryQuery.error)}`] : []),
    ...(categoryBreakdownQuery.isError
      ? [`Category spending: ${errorMessage(categoryBreakdownQuery.error)}`]
      : []),
    ...(budgetsQuery.isError ? [`Budget performance: ${errorMessage(budgetsQuery.error)}`] : []),
    ...(trendsQuery.isError ? [`Spending trends: ${errorMessage(trendsQuery.error)}`] : []),
    ...(recentTransactionsQuery.isError
      ? [`Recent transactions: ${errorMessage(recentTransactionsQuery.error)}`]
      : []),
    ...(categoriesQuery.isError ? [`Categories: ${errorMessage(categoriesQuery.error)}`] : []),
    ...(incomeFallbackQuery.isError
      ? [`Income fallback: ${errorMessage(incomeFallbackQuery.error)}`]
      : []),
    ...(expenseFallbackQuery.isError
      ? [`Expense fallback: ${errorMessage(expenseFallbackQuery.error)}`]
      : []),
  ];
  const overallBudget = budgets?.find((budget) => budget.categoryId === null);
  const categoryBudgets = budgets?.filter((budget) => budget.categoryId !== null) ?? [];
  const selectedMonthLabel = monthLabel(selectedMonth);
  const retryDashboard = () => {
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.financial(queryUserId) });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.categories(queryUserId) });
  };

  return (
    <AppShell
      rightPanel={
        <RightPanelSummary
          balance={summary?.netBalance ?? null}
          periodLabel={selectedMonthLabel}
          currency={currency}
          recentTransactions={recentTransactions}
          isLoading={recentTransactionsQuery.isLoading}
          error={recentTransactionsQuery.isError
            ? errorMessage(recentTransactionsQuery.error)
            : null}
        />
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight flex items-center gap-2">
          <span>My Dashboard</span>
          <span className="text-2xl">🚀</span>
        </h1>
        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-navy shadow-comet">
          Month
          <input
            type="month"
            aria-label="Select dashboard month"
            value={selectedMonth}
            onChange={(event) => {
              if (event.target.value) setSelectedMonth(event.target.value);
            }}
            className="min-w-0 rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-navy"
          />
        </label>
      </div>

      <ResourceStatus
        isLoading={isLoading}
        error={errors.length > 0 ? errors.join(' ') : null}
        onRetry={retryDashboard}
      />
      <p className="text-[11px] text-navy-muted">
        Income, expenses, categories, and budgets for {selectedMonthLabel}.
      </p>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-emerald-100/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Total Income</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">
              {formatCurrency(summary.totalIncome, currency)}
            </p>
          </div>
          <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-rose-100/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Total Expenses</p>
            <p className="mt-2 text-2xl font-extrabold text-rose-500">
              {formatCurrency(summary.totalExpenses, currency)}
            </p>
          </div>
          <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-purple-100/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Net Balance</p>
            <p className="mt-2 text-2xl font-extrabold text-navy">
              {formatCurrency(summary.netBalance, currency)}
            </p>
            <p className="mt-1 text-[10px] text-navy-muted">
              {summary.transactionCount} transactions
            </p>
          </div>
        </div>
      )}
      {!isPeriodLoading && !summary && (
        <p role="alert" className="text-xs text-navy-muted">Monthly summary is unavailable.</p>
      )}

      <section className="card-hover bg-white rounded-4xl p-6 sm:p-7 shadow-comet">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-navy">Budget Performance</h2>
          <p className="text-xs text-navy-muted mt-0.5">{selectedMonthLabel}</p>
        </div>
        {isPeriodLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : budgetsQuery.isError ? (
          <p role="alert" className="text-xs text-navy-muted">Budget performance could not be loaded.</p>
        ) : !overallBudget ? (
          <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-navy-muted">
            No overall budget set for {selectedMonthLabel}.
          </p>
        ) : (
          <div className="rounded-3xl bg-[#F8F9FE] p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-navy">Overall monthly budget</h3>
                <p className="mt-1 text-xs text-navy-muted">
                  Budget amount: {formatCurrency(overallBudget.amount, currency)}
                </p>
              </div>
              <div className="text-right text-xs text-navy-muted">
                <p>Remaining</p>
                <p className="mt-1 font-bold text-navy">{formatCurrency(overallBudget.remaining, currency)}</p>
              </div>
            </div>
            <BudgetProgress
              spent={overallBudget.spent}
              total={overallBudget.amount}
              percentage={overallBudget.percentage}
              currency={currency}
            />
          </div>
        )}

        {!isPeriodLoading && !budgetsQuery.isError && budgets && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-navy">Category budgets</h3>
            {categoryBudgets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {categoryBudgets.map((budget) => (
                  <div key={budget.id} className="rounded-3xl border border-gray-100 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-bold text-navy">
                        {budget.category?.name ?? 'Category'}
                      </p>
                      <p className="whitespace-nowrap text-xs text-navy-muted">
                        Remaining {formatCurrency(budget.remaining, currency)}
                      </p>
                    </div>
                    <BudgetProgress
                      spent={budget.spent}
                      total={budget.amount}
                      percentage={budget.percentage}
                      currency={currency}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-navy-muted">No category budgets set for this month.</p>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <WelcomeCard name={user?.name || 'there'} />

        <SpendingTrendChart
          incomes={incomes}
          expenses={expenses}
          analyticsTrends={trends}
          currency={currency}
        />

        <CategorySpendingCard
          categories={categories}
          breakdown={breakdown}
          currency={currency}
          isLoading={categoryBreakdownQuery.isLoading || categoriesQuery.isLoading}
          error={categoryBreakdownQuery.isError
            ? errorMessage(categoryBreakdownQuery.error)
            : null}
        />

        <div className="card-hover bg-white rounded-4xl p-7 shadow-comet flex flex-col items-center justify-center text-center">
          <Sparkles className="w-6 h-6 text-primary mb-3" />
          <h3 className="text-xl font-bold text-navy">Insights</h3>
          <p className="text-xs text-navy-muted mt-2">
            Insights are not available because the current backend does not expose an insights endpoint.
          </p>
        </div>
      </div>
    </AppShell>
  );
};
