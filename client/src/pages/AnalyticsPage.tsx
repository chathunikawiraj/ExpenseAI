import React, { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { TrendingUp, PieChart, BarChart3, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { analyticsApi } from '../services/apiService';
import { ResourceStatus } from '../components/common/ResourceStatus';
import { AnalyticsTrends, CategoryBreakdown, DashboardSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

const tooltipContentStyle = {
  backgroundColor: '#22263A',
  borderRadius: '16px',
  border: '1px solid #363B55',
  color: '#F4F2FF',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
  fontSize: '12px',
};

const tooltipLabelStyle = { color: '#F4F2FF', fontWeight: 700 };
const tooltipItemStyle = { color: '#F4F2FF' };

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'LKR';
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.getSummary(),
      analyticsApi.getCategoryBreakdown(),
      analyticsApi.getTrends(6),
    ])
      .then(([nextSummary, nextBreakdown, nextTrends]) => {
        if (!active) return;
        setSummary(nextSummary);
        setBreakdown(nextBreakdown);
        setTrends(nextTrends);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load analytics.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [refreshCount]);

  const categoryData = (breakdown?.categories ?? []).map((item, index) => ({
    name: item.name,
    value: item.amount,
    percentage: item.percentage,
    color: ['#9275F5', '#F17D9A', '#647FEA', '#4BC9A2', '#B49AFF'][index % 5],
  }));
  const momData = (trends?.monthly ?? []).map((item) => {
    const [year, monthNumber] = item.month.split('-');
    const label = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1))
      .toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return { month: label, income: item.income, expense: item.expense };
  });
  const trendData = (trends?.daily ?? []).map((item) => ({
    day: new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    spend: item.expense,
  }));
  const largestCategory = (breakdown?.categories ?? []).slice().sort((a, b) => b.amount - a.amount)[0];
  const averageDailySpend = trendData.length
    ? trendData.reduce((total, item) => total + item.spend, 0) / trendData.length
    : 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Analytics & Trends
        </h1>
        <p className="text-xs text-navy-muted">
          Deep visual insights into your cashflow, month-over-month variances, and categorical allocations (FR-24, FR-25).
        </p>
      </div>

      <ResourceStatus
        isLoading={isLoading}
        error={error}
        onRetry={() => setRefreshCount((count) => count + 1)}
      />

      {/* Top 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-hover bg-card-blue rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Total Net Savings</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">
              {summary ? formatCurrency(summary.netBalance, currency) : '—'}
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              {summary ? `${summary.transactionCount} transactions` : 'Loading totals'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-primary">
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        <div className="card-hover bg-card-lavender rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Largest Category</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">
              {largestCategory ? largestCategory.name : 'No expenses'}
            </h3>
            <span className="text-[11px] text-navy-muted font-medium mt-1 block">
              {largestCategory
                ? `${formatCurrency(largestCategory.amount, currency)} · ${largestCategory.percentage.toFixed(1)}%`
                : 'No category allocation yet'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-primary">
            <PieChart className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        <div className="card-hover bg-white rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Avg. Daily Spend</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">
              {formatCurrency(averageDailySpend, currency)}
            </h3>
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Based on 30 daily values
            </span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-primary-light flex items-center justify-center text-primary">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Charts Grid: Month-over-Month Bar (Left) and Donut Category (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* MoM Comparison Bar Chart */}
        <div className="card-hover lg:col-span-7 bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy">Month-over-Month Cashflow</h3>
            <p className="text-xs text-navy-muted mt-0.5">Comparing Income vs Expense trends</p>
          </div>

          <div className="h-64 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={momData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363B55" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#A5A5BE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#A5A5BE' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => formatCurrency(Number(value), currency)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income" fill="#4BC9A2" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#F17D9A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Allocation Donut Chart */}
        <div className="card-hover lg:col-span-5 bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy">Spending by Category</h3>
            <p className="text-xs text-navy-muted mt-0.5">Categorical distribution across all records</p>
          </div>

          <div className="h-64 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => formatCurrency(Number(value), currency)}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-gray-100">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-navy">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name} · {item.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 30-Day Line Trend Chart */}
      <div className="card-hover bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy">Daily Expense Trajectory</h3>
          <p className="text-xs text-navy-muted mt-0.5">Daily outlays across the current billing period</p>
        </div>

        <div className="h-60 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363B55" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#A5A5BE' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#A5A5BE' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => formatCurrency(Number(value), currency)}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#9275F5"
                strokeWidth={3}
                dot={{ r: 4, fill: '#9275F5' }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  );
};
