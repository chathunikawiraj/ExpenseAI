import React from 'react';
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
import { mockCategories } from '../data/mockData';

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
  // Category breakdown for Pie/Donut
  const categoryData = [
    { name: 'Shopping & Tech', value: 1520.5, color: '#9275F5' },
    { name: 'Food & Dining', value: 85.3, color: '#F17D9A' },
    { name: 'Transportation', value: 75.0, color: '#647FEA' },
    { name: 'Utilities & Bills', value: 142.5, color: '#4BC9A2' },
    { name: 'Entertainment', value: 64.0, color: '#B49AFF' },
  ];

  // Month-over-month comparison data
  const momData = [
    { month: 'Jun', income: 4800, expense: 2100 },
    { month: 'Jul', income: 5200, expense: 2400 },
    { month: 'Aug', income: 5500, expense: 2650 },
    { month: 'Sep', income: 5835, expense: 1887 },
  ];

  // 30-day spending trend
  const trendData = [
    { day: 'Sep 1', spend: 120 },
    { day: 'Sep 2', spend: 64 },
    { day: 'Sep 3', spend: 142 },
    { day: 'Sep 4', spend: 35 },
    { day: 'Sep 5', spend: 75 },
    { day: 'Sep 6', spend: 85 },
    { day: 'Sep 7', spend: 1280 },
  ];

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

      {/* Top 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-hover bg-card-blue rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Total Net Savings</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">+$3,948.20</h3>
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              +14.2% vs last month
            </span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-primary">
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        <div className="card-hover bg-card-lavender rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Largest Category</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">Tech (80.5%)</h3>
            <span className="text-[11px] text-navy-muted font-medium mt-1 block">
              $1,520.50 allocated
            </span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-primary">
            <PieChart className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        <div className="card-hover bg-white rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Avg. Daily Spend</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">$269.61</h3>
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Impacted by hardware buy
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
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income ($)" fill="#4BC9A2" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Expense ($)" fill="#F17D9A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Allocation Donut Chart */}
        <div className="card-hover lg:col-span-5 bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy">Spending by Category</h3>
            <p className="text-xs text-navy-muted mt-0.5">Categorical distribution for September</p>
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
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-gray-100">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-navy">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
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
