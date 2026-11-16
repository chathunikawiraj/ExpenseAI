import React from 'react';
import { Check, ShieldCheck, MoreHorizontal } from 'lucide-react';
import { Category } from '../../types';

interface CategorySpendingCardProps {
  categories: Category[];
}

export const CategorySpendingCard: React.FC<CategorySpendingCardProps> = () => {
  return (
    <div className="bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-navy">Credit by Categories</h3>
          <p className="text-xs text-navy-muted mt-0.5">Budget allocations & installments</p>
        </div>
        <button className="text-navy-muted hover:text-navy transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Lavender Card Item matching Screenshot (Installment - $240) */}
        <div className="bg-card-lavender rounded-3xl p-4 flex items-center justify-between transition-transform hover:scale-[1.01]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-navy flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy">Installment</h4>
              <p className="text-xs text-navy/70">Samantha William</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-navy">$240</span>
          </div>
        </div>

        {/* Second Item (Other loans - $20) */}
        <div className="bg-[#F8F9FE] rounded-3xl p-4 flex items-center justify-between hover:bg-gray-100/80 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy">Other loans</h4>
              <p className="text-xs text-navy-muted">Jonathan W.</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-navy">$20</span>
          </div>
        </div>
      </div>
    </div>
  );
};
