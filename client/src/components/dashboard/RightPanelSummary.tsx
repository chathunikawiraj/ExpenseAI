import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wallet } from 'lucide-react';
import { Expense } from '../../types';

interface RightPanelSummaryProps {
  balance: number | null;
  dateStr: string;
  recentExpenses: Expense[];
  onViewMoreTransactions?: () => void;
}

export const RightPanelSummary: React.FC<RightPanelSummaryProps> = ({
  balance,
  dateStr,
  recentExpenses,
  onViewMoreTransactions,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-transparent px-2 pt-2 xl:pt-14">
        <h2 className="text-3xl font-extrabold text-navy tracking-tight">
          {balance === null
            ? '—'
            : `$ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </h2>
        <p className="text-xs text-navy-muted font-medium mt-1">
          {balance === null ? 'Current balance is unavailable' : dateStr}
        </p>
      </div>

      <div className="card-hover bg-white rounded-4xl p-6 shadow-comet">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">Recent Expenses</span>
        </div>

        <div className="flex flex-col divide-y divide-gray-50">
          {recentExpenses.slice(0, 3).map((expense) => (
            <div
              key={expense.id}
              onClick={() => navigate('/transactions')}
              className="py-3 flex items-center justify-between group cursor-pointer hover:bg-navy-light/60 px-2 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Wallet className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-navy group-hover:text-primary transition-colors truncate">
                    {expense.title}
                  </h4>
                  <p className="text-[10px] text-navy-muted">
                    {expense.category?.name || 'Expense'} · {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-navy whitespace-nowrap">
                ${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {recentExpenses.length === 0 && (
            <p className="py-5 text-center text-xs text-navy-muted">No expenses recorded yet.</p>
          )}
        </div>

        <button
          onClick={onViewMoreTransactions || (() => navigate('/transactions'))}
          className="w-full mt-4 py-2.5 bg-primary-light hover:bg-[#363B55] text-primary text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1"
        >
          View More <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="card-hover bg-white rounded-4xl p-6 shadow-comet flex flex-col justify-between">
        <h3 className="text-base font-bold text-navy">Account Summary</h3>
        <p className="text-[11px] text-navy-muted mt-2">
          Balance and transaction totals are calculated from all account records in the selected period.
        </p>
        <button
          onClick={() => navigate('/transactions')}
          className="self-start mt-4 text-[11px] font-semibold text-primary hover:underline"
        >
          View transactions
        </button>
      </div>
    </div>
  );
};
