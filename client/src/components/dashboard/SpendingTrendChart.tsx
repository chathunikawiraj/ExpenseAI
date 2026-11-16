import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CardActionMenu } from '../common/CardActionMenu';
import { Expense, Income } from '../../types';

type Period = 'This week' | 'This month' | 'This year';

interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

interface SpendingTrendChartProps {
  incomes: Income[];
  expenses: Expense[];
}

const buildTrend = (period: Period, incomes: Income[], expenses: Expense[]) => {
  const transactions = [
    ...incomes.map((income) => ({
      date: income.date.slice(0, 10),
      amount: income.amount,
      type: 'income' as const,
    })),
    ...expenses.map((expense) => ({
      date: expense.date.slice(0, 10),
      amount: expense.amount,
      type: 'expense' as const,
    })),
  ];

  const latestDate =
    transactions.reduce<Date | null>((latest, transaction) => {
      const date = new Date(`${transaction.date}T00:00:00Z`);
      return !latest || date > latest ? date : latest;
    }, null) || new Date();
  const year = latestDate.getUTCFullYear();
  const month = latestDate.getUTCMonth();
  const day = latestDate.getUTCDate();
  const startDate =
    period === 'This year'
      ? new Date(Date.UTC(year, 0, 1))
      : period === 'This month'
        ? new Date(Date.UTC(year, month, 1))
        : new Date(Date.UTC(year, month, day - 6));
  const pointCount =
    period === 'This year'
      ? 12
      : period === 'This month'
        ? new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
        : 7;

  const points = Array.from({ length: pointCount }, (_, index) => {
    const date =
      period === 'This year'
        ? new Date(Date.UTC(year, index, 1))
        : new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
    const key = period === 'This year' ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10);
    const label =
      period === 'This year'
        ? date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
        : period === 'This month'
          ? String(date.getUTCDate())
          : date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

    return { key, point: { label, income: 0, expense: 0 } satisfies TrendPoint };
  });
  const pointsByKey = new Map(points.map(({ key, point }) => [key, point]));
  const endDate =
    period === 'This year'
      ? new Date(Date.UTC(year, 11, 31))
      : period === 'This month'
        ? new Date(Date.UTC(year, month + 1, 0))
        : new Date(Date.UTC(year, month, day));

  transactions.forEach((transaction) => {
    const transactionDate = new Date(`${transaction.date}T00:00:00Z`);
    if (transactionDate < startDate || transactionDate > endDate) return;
    const key = period === 'This year' ? transaction.date.slice(0, 7) : transaction.date;
    const point = pointsByKey.get(key);
    if (point) point[transaction.type] += transaction.amount;
  });

  const trend = points.map(({ point }) => point);
  return {
    trend,
    incomeTotal: trend.reduce((total, point) => total + point.income, 0),
    expenseTotal: trend.reduce((total, point) => total + point.expense, 0),
    activePeriods: trend.filter((point) => point.income > 0 || point.expense > 0).length,
  };
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  incomes,
  expenses,
}) => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('This week');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const periodData = useMemo(() => buildTrend(period, incomes, expenses), [period, incomes, expenses]);
  const periodUnit = period === 'This year' ? 'months' : 'days';

  return (
    <div className="card-hover bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-navy">Spending Trend</h3>
            <CardActionMenu
              label="Spending trend actions"
              actions={[
                { label: 'Open Analytics', onSelect: () => navigate('/analytics') },
                { label: 'View Transactions', onSelect: () => navigate('/transactions') },
              ]}
            />
          </div>
          <p className="text-xs text-primary font-semibold mt-0.5">
            Expenses by {period === 'This year' ? 'month' : 'day'}
            <span className="text-navy-muted font-normal"> · {period}</span>
          </p>
        </div>

        {/* Period Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#F8F9FE] hover:bg-gray-100 text-xs font-semibold text-navy rounded-full transition-all border border-gray-100"
          >
            <span>{period}</span>
            <ChevronDown className="w-3.5 h-3.5 text-navy-muted" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-comet-lg border border-purple-50 py-1.5 z-30">
              {(['This week', 'This month', 'This year'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setPeriod(opt);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary transition-colors ${
                    period === opt ? 'text-primary font-bold bg-primary-light/50' : 'text-navy'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* The selected period changes the number and grouping of chart points. */}
      <div className="h-44 w-full my-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={periodData.trend} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9275F5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#9275F5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              interval={period === 'This month' ? 4 : period === 'This year' ? 1 : 0}
              tick={{ fontSize: 10, fill: '#8790A8' }}
              tickLine={false}
              axisLine={false}
              height={24}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-navy text-white text-xs px-3 py-2 rounded-xl shadow-lg">
                      <p className="font-bold">{label}</p>
                      <p>Income: ${Number(payload[0].payload.income).toFixed(2)}</p>
                      <p>Expenses: ${Number(payload[0].payload.expense).toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#9275F5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#purpleGradient)"
              activeDot={{ r: 6, fill: '#9275F5', stroke: '#FFFFFF', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Stat Tiles: Generated & Removed */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0">
            <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy">Income</h4>
            <p className="text-xs text-navy-muted">
              ${periodData.incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[11px]">({periodData.activePeriods} active {periodUnit})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy">Expenses</h4>
            <p className="text-xs text-navy-muted">
              ${periodData.expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[11px]">({periodData.activePeriods} active {periodUnit})</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
