import React from 'react';

interface BudgetProgressProps {
  spent: number;
  total: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  spent,
  total,
  showLabels = true,
  size = 'md',
  className = '',
}) => {
  const percentage = total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0;
  const isOver = spent > total;

  let barColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let statusText = 'On Track';

  if (isOver || percentage >= 100) {
    barColor = 'bg-rose-500';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = 'Exceeded';
  } else if (percentage >= 80) {
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    statusText = 'Warning (80%+)';
  } else if (percentage >= 50) {
    barColor = 'bg-primary';
    badgeColor = 'bg-primary-light text-primary border-purple-200';
    statusText = 'Moderate (50%+)';
  }

  const heightClass = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-2.5';

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy">${spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-navy-muted">of ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor}`}>
              {statusText}
            </span>
            <span className="font-bold text-navy">{percentage}%</span>
          </div>
        </div>
      )}

      {/* Progress Track */}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heightClass} relative`}>
        {/* Threshold guides */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70 z-10" title="50% Threshold" />
        <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-white/70 z-10" title="80% Threshold" />

        <div
          className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};
