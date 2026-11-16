import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  CheckCircle,
  Laptop,
  Boxes,
  UserCheck
} from 'lucide-react';
import { Expense } from '../../types';
import { CardActionMenu } from '../common/CardActionMenu';
import { Modal } from '../common/Modal';

interface RightPanelSummaryProps {
  balance: number;
  dateStr: string;
  recentExpenses: Expense[];
  onViewMoreTransactions?: () => void;
}

export const RightPanelSummary: React.FC<RightPanelSummaryProps> = ({
  balance,
  dateStr,
  onViewMoreTransactions,
}) => {
  const navigate = useNavigate();
  const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);

  const todayTransactions = [
    {
      id: 'tx_01',
      title: 'Hunter Macbook',
      accountNo: '063873347859-798',
      amount: 1280.5,
      isNew: true,
      icon: Laptop,
      iconBg: 'bg-primary-light text-primary',
    },
    {
      id: 'tx_02',
      title: 'Hexagon',
      accountNo: '924693249950-860',
      amount: 240.0,
      isNew: false,
      icon: Boxes,
      iconBg: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'tx_03',
      title: 'Marco Ruiz',
      accountNo: '063873347859-645',
      amount: 450.5,
      isNew: false,
      icon: UserCheck,
      iconBg: 'bg-card-lavender text-primary',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Balance & Date Header matching Screenshot */}
      <div className="bg-transparent px-2 pt-2 xl:pt-14">
        <h2 className="text-3xl font-extrabold text-navy tracking-tight">
          $ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <p className="text-xs text-navy-muted font-medium mt-1">
          {dateStr}
        </p>
      </div>

      {/* Today Section */}
      <div className="card-hover bg-white rounded-4xl p-6 shadow-comet">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">Today</span>
        </div>

        <div className="flex flex-col divide-y divide-gray-50">
          {todayTransactions.map((tx) => {
            const Icon = tx.icon;
            return (
              <div
                key={tx.id}
                onClick={() => navigate('/transactions')}
                className="py-3 flex items-center justify-between group cursor-pointer hover:bg-navy-light/60 px-2 rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${tx.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-navy group-hover:text-primary transition-colors">
                        {tx.title}
                      </h4>
                      {tx.isNew && (
                        <span className="bg-accent-info text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-navy-muted font-mono">{tx.accountNo}</p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-navy-muted group-hover:text-navy group-hover:translate-x-0.5 transition-all" />
              </div>
            );
          })}
        </div>

        {/* View More Pill Button */}
        <button
          onClick={onViewMoreTransactions || (() => navigate('/transactions'))}
          className="w-full mt-4 py-2.5 bg-primary-light hover:bg-[#363B55] text-primary text-xs font-bold rounded-full transition-colors"
        >
          View More
        </button>
      </div>

      {/* Loan Calculator / Budget Tracker Card */}
      <div className="card-hover bg-white rounded-4xl p-6 shadow-comet flex flex-col justify-between">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-base font-bold text-navy">Loan Calculator</h3>
            <p className="text-[11px] text-navy-muted mt-0.5 max-w-[200px]">
              Choose a loan amount and term
            </p>
          </div>
          <CardActionMenu
            label="Loan summary actions"
            actions={[
              { label: 'Manage Budgets', onSelect: () => navigate('/budgets') },
              { label: 'View Transactions', onSelect: () => navigate('/transactions') },
            ]}
          />
        </div>

        {/* Blue Pill Amount Display with slider illusion matching screenshot */}
        <div className="my-4 p-3 bg-card-blue/50 rounded-3xl flex items-center justify-between relative overflow-hidden border border-blue-100/60">
          <div className="z-10 pl-2">
            <h4 className="text-lg font-extrabold text-navy">$ 450.50</h4>
            <span className="text-[10px] text-navy-muted font-medium">All loan amount</span>
          </div>
          <div className="w-20 h-10 bg-card-blue rounded-2xl shadow-inner flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* People Avatar Chips + Count Badge */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center -space-x-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
              alt="Avatar 1"
              className="w-7 h-7 rounded-full border-2 border-white object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
              alt="Avatar 2"
              className="w-7 h-7 rounded-full border-2 border-white object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
              alt="Avatar 3"
              className="w-7 h-7 rounded-full border-2 border-white object-cover"
            />
            <div className="w-7 h-7 rounded-full bg-navy text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
              18
            </div>
          </div>
          <button
            onClick={() => setIsPeopleDialogOpen(true)}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            View More people
          </button>
        </div>
      </div>

      <Modal
        isOpen={isPeopleDialogOpen}
        onClose={() => setIsPeopleDialogOpen(false)}
        title="People"
        subtitle="Your dashboard community summary"
        maxWidth="sm"
      >
        <div className="rounded-2xl border border-purple-100 bg-primary-light/50 p-4">
          <p className="text-2xl font-extrabold text-navy">18 people</p>
          <p className="mt-1 text-xs leading-relaxed text-navy-muted">
            This card only contains a community count. A people directory is not available yet, so it no longer redirects to Budgets.
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setIsPeopleDialogOpen(false)}
            className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};
