import React, { useState, useEffect, useCallback } from 'react';
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
import { Budget, SavingsGoal, Category } from '../types';
import { budgetsApi, transactionsApi } from '../services/apiService';
import { ResourceStatus } from '../components/common/ResourceStatus';

export const BudgetsGoalsPage: React.FC = () => {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    const month = new Date().toISOString().slice(0, 7);
    const [nextBudgets, nextGoals, nextCategories] = await Promise.all([
      budgetsApi.getBudgets(month),
      budgetsApi.getGoals(),
      transactionsApi.getCategories(),
    ]);
    setBudgets(nextBudgets);
    setGoals(nextGoals);
    setCategories(nextCategories);
  }, []);

  useEffect(() => {
    let active = true;
    loadData()
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'The server request failed.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadData]);

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
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const overallBudget = budgets.find((b) => b.categoryId === null) || budgets[0];

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(budgetAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const catId = budgetCategory === 'overall' ? null : budgetCategory;
    const cat = categories.find((c) => c.id === catId);

    setIsSaving(true);
    try {
      await budgetsApi.createOrUpdateBudget({
        categoryId: catId,
        month: new Date().toISOString().slice(0, 7),
        amount: amountNum,
      });
      await loadData();
      showToast(`Budget for ${cat?.name || 'Overall'} saved!`, 'success');
      setIsAddBudgetOpen(false);
      setBudgetAmount('');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save this budget.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetAmount);
    const saved = parseFloat(goalCurrentAmount) || 0;
    if (isNaN(target) || target <= 0) return;

    setIsSaving(true);
    try {
      const goal = await budgetsApi.createGoal({
        name: goalName.trim(),
        targetAmount: target,
        savedAmount: saved,
        targetDate: goalTargetDate,
        color: '#9275F5',
      });
      setGoals((items) => [goal, ...items]);
      showToast(`Savings goal "${goalName}" created!`, 'success');
      setIsAddGoalOpen(false);
      setGoalName('');
      setGoalTargetAmount('');
      setGoalCurrentAmount('');
      setGoalTargetDate('');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not create this goal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    if (!window.confirm(`Delete the "${goal.name}" savings goal?`)) return;
    try {
      await budgetsApi.deleteGoal(goal.id);
      setGoals((items) => items.filter((item) => item.id !== goal.id));
      showToast('Savings goal deleted.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete this goal.', 'error');
    }
  };

  const handleAddContribution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contributionGoal) return;
    const amount = Number(contributionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a contribution greater than zero.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await budgetsApi.contributeToGoal(contributionGoal.id, { amount });
      setGoals((items) => items.map((item) => item.id === updated.id ? updated : item));
      setContributionGoal(null);
      setContributionAmount('');
      showToast('Savings contribution added.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not add the contribution.', 'error');
    } finally {
      setIsSaving(false);
    }
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

        <ResourceStatus
          isLoading={isLoading}
          error={loadError}
          onRetry={() => {
            setLoadError(null);
            setIsLoading(true);
            loadData()
              .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause.message : 'The server request failed.'))
              .finally(() => setIsLoading(false));
          }}
        />

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
                Monthly Overall Budget ({new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })})
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
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Delete this category budget?')) return;
                        try {
                          await budgetsApi.deleteBudget(b.id);
                          setBudgets((items) => items.filter((item) => item.id !== b.id));
                          showToast('Budget deleted.', 'success');
                        } catch (cause) {
                          showToast(cause instanceof Error ? cause.message : 'Could not delete this budget.', 'error');
                        }
                      }}
                      className="self-end rounded-full px-3 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
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
                      Target: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No date'}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      ${Math.max(0, goal.targetAmount - goal.savedAmount).toLocaleString()} left
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setContributionGoal(goal)}
                      className="rounded-full border border-purple-100 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary-light"
                    >
                      Add savings
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteGoal(goal)}
                      className="rounded-full px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
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
              {categories.map((c) => (
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
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Budget'}
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
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(contributionGoal)}
        onClose={() => setContributionGoal(null)}
        title="Add Savings"
        subtitle={contributionGoal ? `Update progress for ${contributionGoal.name}` : 'Savings contribution'}
      >
        <form onSubmit={handleAddContribution} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Contribution Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={contributionAmount}
              onChange={(event) => setContributionAmount(event.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setContributionGoal(null)} className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Add Savings'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};
