import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { UnifiedTransaction } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

interface RightPanelSummaryProps {
  balance: number | null;
  periodLabel: string;
  currency: string;
  recentTransactions: UnifiedTransaction[];
  isLoading?: boolean;
  error?: string | null;
  onViewMoreTransactions?: () => void;
}

export const RightPanelSummary: React.FC<RightPanelSummaryProps> = ({
  balance,
  periodLabel,
  currency,
  recentTransactions,
  isLoading = false,
  error,
  onViewMoreTransactions,
}) => {
  const navigate = useNavigate();
  const formatDate = (dateValue: string) => {
    const [year, month, day] = dateValue.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-transparent px-2 pt-2 xl:pt-14">
        <h2 className="text-3xl font-extrabold text-navy tracking-tight">
          {balance === null
            ? '—'
            : formatCurrency(balance, currency)}
        </h2>
        <p className="text-xs text-navy-muted font-medium mt-1">
          {balance === null ? 'Monthly net balance unavailable' : `${periodLabel} net balance`}
        </p>
      </div>

      <div className="card-hover bg-white rounded-4xl p-6 shadow-comet">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">Recent Transactions</span>
        </div>

        <div className="flex flex-col divide-y divide-gray-50">
          {isLoading ? (
            <p role="status" className="py-5 text-center text-xs text-navy-muted">Loading recent transactions...</p>
          ) : error ? (
            <p role="alert" className="py-5 text-center text-xs text-navy-muted">Recent transactions could not be loaded.</p>
          ) : (
            recentTransactions.slice(0, 5).map((transaction) => {
              const isIncome = transaction.type === 'income';
              const details = isIncome
                ? transaction.description || 'Income'
                : [
                    transaction.category?.name,
                    transaction.paymentMethod?.replace(/_/g, ' '),
                  ].filter((value): value is string => Boolean(value)).join(' · ') || 'Expense';
              const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

              return (
                <button
                  type="button"
                  key={`${transaction.type}-${transaction.id}`}
                  onClick={() => navigate('/transactions')}
                  className="py-3 flex w-full items-center justify-between group cursor-pointer hover:bg-navy-light/60 px-2 rounded-2xl transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
                    }`}>
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-navy group-hover:text-primary transition-colors truncate">
                        {transaction.title}
                      </h4>
                      <p className="text-[10px] text-navy-muted truncate">
                        {details} · {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${
                    isIncome ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                    {isIncome ? '+' : '−'}{formatCurrency(transaction.amount, currency)}
                  </span>
                </button>
              );
            })
          )}
          {!isLoading && !error && recentTransactions.length === 0 && (
            <p className="py-5 text-center text-xs text-navy-muted">No transactions recorded yet.</p>
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
          Balance and summary totals are for {periodLabel}.
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
