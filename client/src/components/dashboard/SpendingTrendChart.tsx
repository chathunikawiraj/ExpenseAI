import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ArrowDownLeft, ArrowUpRight, MoreHorizontal } from 'lucide-react';

interface SpendingTrendChartProps {
  data: { day: string; amount: number; dispute: number }[];
  incomeTotal: number;
  expenseTotal: number;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({
  data,
  incomeTotal,
  expenseTotal,
}) => {
  const [period, setPeriod] = useState<'This week' | 'This month' | 'This year'>('This week');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-navy">Dispute Progress</h3>
            <button className="text-navy-muted hover:text-navy transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-primary font-semibold mt-0.5">
            30 dispute <span className="text-navy-muted font-normal">in this month</span>
          </p>
        </div>

        {/* Period Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

      {/* Recharts Curved Area Graph matching screenshot curve & purple indicator badge */}
      <div className="h-44 w-full my-4 relative">
        {/* Floating marker pill badge mirroring the screenshot's '25%' indicator */}
        <div className="absolute right-[22%] top-[18%] -translate-y-full -translate-x-1/2 bg-navy text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
          <span>25%</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-navy rotate-45" />
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9275F5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#9275F5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-navy text-white text-xs px-3 py-1.5 rounded-xl shadow-lg">
                      <p className="font-bold">${payload[0].value}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
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
            <h4 className="text-sm font-bold text-navy">Generated</h4>
            <p className="text-xs text-navy-muted">
              ${incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="text-[11px]">(200 acc)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy">Removed</h4>
            <p className="text-xs text-navy-muted">
              ${expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="text-[11px]">(12 acc)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
