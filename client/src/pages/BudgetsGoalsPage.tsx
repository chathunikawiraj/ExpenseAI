import React, { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { BudgetProgress } from '../components/common/BudgetProgress';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import {
  PieChart,
  Target,
  Plus,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Sparkles,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import {
  mockBudgets,
  mockSavingsGoals,
  mockCategories,
} from '../data/mockData';
import { Budget, SavingsGoal } from '../types';

export const BudgetsGoalsPage: React.FC = () => {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);
  const [goals, setGoals] = useState<SavingsGoal[]>(mockSavingsGoals);

  // Modals
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // Budget form
  const [budgetCategory, setBudgetCategory] = useState<string>('overall');
  const [budgetAmount, setBudgetAmount] = useState('');

  // Goal form
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  const overallBudget = budgets.find((b) => b.categoryId === null) || budgets[0];

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(budgetAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const catId = budgetCategory === 'overall' ? null : budgetCategory;
    const cat = mockCategories.find((c) => c.id === catId);

    const newBudget: Budget = {
      id: `bud_${Date.now()}`,
      userId: 'usr_01j7890123456789abcdef01',
      categoryId: catId,
      category: cat,
      month: '2026-09',
      amount: amountNum,
      spent: 0,
      percentage: 0,
    };

    setBudgets([newBudget, ...budgets]);
    showToast(`Budget for ${cat?.name || 'Overall'} saved!`, 'success');
    setIsAddBudgetOpen(false);
    setBudgetAmount('');
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetAmount);
    const saved = parseFloat(goalCurrentAmount) || 0;
    if (isNaN(target) || target <= 0) return;

    const newGoal: SavingsGoal = {
      id: `goal_${Date.now()}`,
      userId: 'usr_01j7890123456789abcdef01',
      name: goalName,
      targetAmount: target,
      savedAmount: saved,
      targetDate: goalTargetDate,
      color: '#9275F5',
    };

    setGoals([...goals, newGoal]);
    showToast(`Savings goal "${goalName}" created!`, 'success');
    setIsAddGoalOpen(false);
    setGoalName('');
    setGoalTargetAmount('');
    setGoalCurrentAmount('');
    setGoalTargetDate('');
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Budgets & Savings Goals
          </h1>
          <p className="text-xs text-navy-muted mt-0.5">
            Real-time monthly threshold monitoring (50%, 80%, 100%) and long-term milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddBudgetOpen(true)}
            className="px-5 py-2.5 bg-white hover:bg-gray-50 text-navy text-xs font-bold rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Set Budget</span>
          </button>
          <button
            onClick={() => setIsAddGoalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Overall Budget Overview Card */}
      {overallBudget && (
        <div className="bg-card-lavender rounded-4xl p-6 sm:p-8 shadow-comet relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-navy/70 uppercase tracking-wider">
                Monthly Overall Budget (September 2026)
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy mt-1">
                ${overallBudget.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-navy/70 mt-1">
                ${(overallBudget.spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} spent so far ({overallBudget.percentage || 0}%)
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm p-4 rounded-3xl border border-white">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-navy-muted uppercase">Remaining Buffer</span>
                <span className="text-lg font-bold text-emerald-600">
                  ${Math.max(0, overallBudget.amount - (overallBudget.spent || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-8 w-px bg-purple-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-navy-muted uppercase">Alert Status</span>
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Under 80% Safe
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <BudgetProgress
              spent={overallBudget.spent || 0}
              total={overallBudget.amount}
              size="lg"
            />
          </div>
        </div>
      )}

      {/* Grid: Category Budgets (Left) and Savings Goals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Budgets Column */}
        <div className="lg:col-span-7 bg-white rounded-4xl p-6 sm:p-7 shadow-comet flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-navy">Category Budgets</h3>
            </div>
            <span className="text-xs text-navy-muted font-medium">Automated Thresholds</span>
          </div>

          <div className="flex flex-col gap-5">
            {budgets
              .filter((b) => b.categoryId !== null)
              .map((b) => {
                const spent = b.spent || 0;
                const total = b.amount;
                const isOver80 = spent / total >= 0.8;
                return (
                  <div key={b.id} className="p-4 bg-[#F8F9FE] rounded-3xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-navy">
                          {b.category?.name || 'Category'}
                        </span>
                        {isOver80 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3" />
                            Threshold Alert
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-navy">
                        ${spent.toFixed(2)} / ${total.toFixed(2)}
                      </span>
                    </div>

                    <BudgetProgress spent={spent} total={total} showLabels={false} />
                  </div>
                );
              })}
          </div>
        </div>

        {/* Savings Goals Column */}
        <div className="lg:col-span-5 bg-white rounded-4xl p-6 sm:p-7 shadow-comet flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-navy">Savings Goals</h3>
            </div>
            <span className="text-xs text-primary font-bold">{goals.length} Active</span>
          </div>

          <div className="flex flex-col gap-4">
            {goals.map((goal) => {
              const pct = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
              return (
                <div key={goal.id} className="p-4 border border-purple-50 rounded-3xl bg-white shadow-card-soft flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-navy">{goal.name}</h4>
                    <span className="text-xs font-bold text-primary">{pct}%</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-navy-muted">
                    <span>${goal.savedAmount.toLocaleString()} saved</span>
                    <span>Target: ${goal.targetAmount.toLocaleString()}</span>
                  </div>

                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-navy-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      ${Math.max(0, goal.targetAmount - goal.savedAmount).toLocaleString()} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Set Budget Modal */}
      <Modal
        isOpen={isAddBudgetOpen}
        onClose={() => setIsAddBudgetOpen(false)}
        title="Set Budget Limit"
        subtitle="Configure monthly overall or category spending boundaries"
      >
        <form onSubmit={handleSaveBudget} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Target Category</label>
            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            >
              <option value="overall">Monthly Overall Budget</option>
              {mockCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Budget Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="e.g. 500.00"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddBudgetOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow"
            >
              Save Budget
            </button>
          </div>
        </form>
      </Modal>

      {/* New Savings Goal Modal */}
      <Modal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
        title="Create Savings Goal"
        subtitle="Set a milestone target date and target amount"
      >
        <form onSubmit={handleSaveGoal} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Goal Name</label>
            <input
              type="text"
              required
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Trip to Tokyo"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Target Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={goalTargetAmount}
                onChange={(e) => setGoalTargetAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Current Saved ($)</label>
              <input
                type="number"
                step="0.01"
                value={goalCurrentAmount}
                onChange={(e) => setGoalCurrentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Target Date</label>
            <input
              type="date"
              required
              value={goalTargetDate}
              onChange={(e) => setGoalTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddGoalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow"
            >
              Create Goal
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};
