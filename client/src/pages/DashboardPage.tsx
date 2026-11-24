import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { SpendingTrendChart } from '../components/dashboard/SpendingTrendChart';
import { CategorySpendingCard } from '../components/dashboard/CategorySpendingCard';
import { RightPanelSummary } from '../components/dashboard/RightPanelSummary';
import { ResourceStatus } from '../components/common/ResourceStatus';
import { analyticsApi, transactionsApi } from '../services/apiService';
import { Expense, Income, Category, DashboardSummary, AnalyticsTrends, CategoryBreakdown } from '../types';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [incomeResult, expenseResult, nextCategories, nextSummary, nextTrends, nextBreakdown] = await Promise.all([
        transactionsApi.getIncomes({ page: 1, limit: 20, sortBy: 'date', order: 'desc' }),
        transactionsApi.getExpenses({ page: 1, limit: 20, sortBy: 'date', order: 'desc' }),
        transactionsApi.getCategories(),
        analyticsApi.getSummary(),
        analyticsApi.getTrends(12),
        analyticsApi.getCategoryBreakdown(),
      ]);
      setIncomes(incomeResult.data);
      setExpenses(expenseResult.data);
      setCategories(nextCategories);
      setSummary(nextSummary);
      setTrends(nextTrends);
      setBreakdown(nextBreakdown);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The server request failed.');
      setIncomes([]);
      setExpenses([]);
      setCategories([]);
      setSummary(null);
      setTrends(null);
      setBreakdown(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData, refreshCount]);

  return (
    <AppShell
      rightPanel={
        <RightPanelSummary
          balance={summary?.netBalance ?? null}
          dateStr={new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          recentExpenses={expenses}
        />
      }
    >
      {/* Dashboard Top Title with Rocket Emoji matching reference */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight flex items-center gap-2">
          <span>My Dashboard</span>
          <span className="text-2xl">🚀</span>
        </h1>
      </div>

      <ResourceStatus
        isLoading={isLoading}
        error={error}
        onRetry={() => setRefreshCount((count) => count + 1)}
      />
      <p className="text-[11px] text-navy-muted">
        Summary totals include all account records. Trend and category cards use up to the latest 20 records per type.
      </p>

      {!isLoading && !error && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-emerald-100/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Total Income</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">
              ${summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-rose-100/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Total Expenses</p>
            <p className="mt-2 text-2xl font-extrabold text-rose-500">
              ${summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-purple-100/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Net Balance</p>
            <p className="mt-2 text-2xl font-extrabold text-navy">
              ${summary.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-navy-muted">{summary.transactionCount} transactions</p>
          </div>
        </div>
      )}

      {/* 2x2 Grid of Main Cards matching the reference layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Welcome Card with Illustrated Character */}
        <WelcomeCard name={user?.name || 'there'} />

        {/* Card 2: Dispute Progress / Spending Trend Chart */}
        <SpendingTrendChart
          incomes={incomes}
          expenses={expenses}
          analyticsTrends={trends}
        />

        {/* Card 3: Credit by Categories Card */}
        <CategorySpendingCard categories={categories} expenses={expenses} breakdown={breakdown} />

        {/* Card 4: Credit Reports / AI Insights Carousel */}
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
