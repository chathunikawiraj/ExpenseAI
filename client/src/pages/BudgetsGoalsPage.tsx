import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  DollarSign,
  Pencil,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Budget, SavingsContribution, SavingsGoal, Category } from '../types';
import { budgetsApi, transactionsApi } from '../services/apiService';
import { ResourceStatus } from '../components/common/ResourceStatus';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { dashboardQueryKeys } from '../services/dashboardQueryKeys';

export const BudgetsGoalsPage: React.FC = () => {
  const { showToast } = useToast();
  const { reload: reloadNotifications } = useNotifications();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const loadRequestVersion = useRef(0);

  const loadData = useCallback(async (month = selectedMonth) => {
    const requestVersion = ++loadRequestVersion.current;
    const [nextBudgets, nextGoals, nextCategories] = await Promise.all([
      budgetsApi.getBudgets(month),
      budgetsApi.getGoals(),
      transactionsApi.getCategories(),
    ]);
    if (requestVersion !== loadRequestVersion.current) return;
    setBudgets(nextBudgets);
    setGoals(nextGoals);
    setCategories(nextCategories);
  }, [selectedMonth]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [loadingBudgetId, setLoadingBudgetId] = useState<string | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);
  const [loadingGoalId, setLoadingGoalId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // Budget form
  const [budgetCategory, setBudgetCategory] = useState<string>('overall');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Goal form
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contributionNote, setContributionNote] = useState('');
  const [contributionHistory, setContributionHistory] = useState<Record<string, SavingsContribution[]>>({});
  const [contributionHistoryMeta, setContributionHistoryMeta] = useState<
    Record<string, { page: number; totalPages: number; total: number }>
  >({});
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});

  const overallBudget = budgets.find((b) => b.categoryId === null);
  const overallPercentage = overallBudget?.percentage ?? 0;
  const overallStatus = overallPercentage >= 100
    ? { label: 'Limit reached or exceeded', color: 'text-rose-600' }
    : overallPercentage >= 80
      ? { label: 'High spending warning', color: 'text-amber-600' }
      : overallPercentage >= 50
        ? { label: 'Moderate spending', color: 'text-primary' }
        : { label: 'Under 50% used', color: 'text-emerald-600' };

  const closeBudgetModal = () => {
    setIsAddBudgetOpen(false);
    setEditingBudget(null);
  };

  const openNewBudgetModal = () => {
    setEditingBudget(null);
    setBudgetCategory('overall');
    setBudgetAmount('');
    setBudgetMonth(selectedMonth);
    setIsAddBudgetOpen(true);
  };

  const handleEditBudget = async (budget: Budget) => {
    setLoadingBudgetId(budget.id);
    try {
      const currentBudget = await budgetsApi.getBudget(budget.id);
      setEditingBudget(currentBudget);
      setBudgetCategory(currentBudget.categoryId ?? 'overall');
      setBudgetAmount(currentBudget.amount.toFixed(2));
      setBudgetMonth(currentBudget.month);
      setIsAddBudgetOpen(true);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not load this budget.', 'error');
    } finally {
      setLoadingBudgetId(null);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountText = budgetAmount.trim();
    const amountNum = Number(amountText);
    if (
      !/^\d+(\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(amountNum) ||
      amountNum <= 0 ||
      amountNum > 9999999.99
    ) {
      showToast('Enter a valid budget amount with at most two decimal places.', 'error');
      return;
    }
    if (editingBudget && !budgetMonth) {
      showToast('Choose a valid budget month.', 'error');
      return;
    }

    const catId = budgetCategory === 'overall' ? null : budgetCategory;
    const cat = categories.find((c) => c.id === catId);
    let saved = false;
    setIsSaving(true);
    try {
      if (editingBudget) {
        await budgetsApi.updateBudget(editingBudget.id, {
          categoryId: catId,
          month: budgetMonth,
          amount: amountNum,
        });
        reloadNotifications();
        if (budgetMonth !== selectedMonth) {
          setSelectedMonth(budgetMonth);
        } else {
          await loadData(selectedMonth);
        }
      } else {
        await budgetsApi.createOrUpdateBudget({
          categoryId: catId,
          month: selectedMonth,
          amount: amountNum,
        });
      }
      saved = true;
      if (user?.id) {
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.budgets(user.id),
        });
      }
      reloadNotifications();
      showToast(`Budget for ${cat?.name || 'Overall'} ${editingBudget ? 'updated' : 'saved'}!`, 'success');
      closeBudgetModal();
      setBudgetAmount('');
      if (editingBudget && budgetMonth !== selectedMonth) {
        setSelectedMonth(budgetMonth);
      } else {
        setLoadError(null);
        await loadData(selectedMonth);
      }
    } catch (cause) {
      if (saved) {
        const message = cause instanceof Error ? cause.message : 'The server request failed.';
        setLoadError(message);
        showToast('Budget saved, but the latest data could not be refreshed.', 'error');
      } else {
        showToast(cause instanceof Error ? cause.message : 'Could not save this budget.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBudget = async (budget: Budget) => {
    if (!window.confirm(`Delete the ${budget.category?.name ?? 'overall'} budget?`)) return;
    setDeletingBudgetId(budget.id);
    try {
      await budgetsApi.deleteBudget(budget.id);
      if (user?.id) {
        void queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.budgets(user.id),
        });
      }
      setBudgets((items) => items.filter((item) => item.id !== budget.id));
      showToast('Budget deleted.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete this budget.', 'error');
    } finally {
      setDeletingBudgetId(null);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = goalName.trim();
    const amountText = goalTargetAmount.trim();
    const target = Number(amountText);
    if (!name || name.length > 100) {
      showToast('Goal names must contain 1 to 100 characters.', 'error');
      return;
    }
    if (
      !/^\d+(\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(target) ||
      target <= 0 ||
      target > 9999999.99
    ) {
      showToast('Enter a valid target amount with at most two decimal places.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingGoal) {
        const updatedGoal = await budgetsApi.updateGoal(editingGoal.id, {
          name,
          targetAmount: target,
          targetDate: goalTargetDate || null,
        });
        setGoals((items) => items.map((item) => item.id === updatedGoal.id ? updatedGoal : item));
        showToast(`Savings goal "${name}" updated.`, 'success');
      } else {
        const goal = await budgetsApi.createGoal({
          name,
          targetAmount: target,
          ...(goalTargetDate ? { targetDate: goalTargetDate } : {}),
        });
        setGoals((items) => [goal, ...items]);
        showToast(`Savings goal "${name}" created!`, 'success');
      }
      reloadNotifications();
      setIsAddGoalOpen(false);
      setEditingGoal(null);
      setGoalName('');
      setGoalTargetAmount('');
      setGoalTargetDate('');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save this goal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openNewGoalModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalTargetAmount('');
    setGoalTargetDate('');
    setIsAddGoalOpen(true);
  };

  const handleEditGoal = async (goal: SavingsGoal) => {
    setLoadingGoalId(goal.id);
    try {
      const currentGoal = await budgetsApi.getGoal(goal.id);
      setEditingGoal(currentGoal);
      setGoalName(currentGoal.name);
      setGoalTargetAmount(currentGoal.targetAmount.toFixed(2));
      setGoalTargetDate(currentGoal.targetDate ?? '');
      setIsAddGoalOpen(true);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not load this goal.', 'error');
    } finally {
      setLoadingGoalId(null);
    }
  };

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    if (!window.confirm(`Delete the "${goal.name}" savings goal?`)) return;
    setDeletingGoalId(goal.id);
    try {
      await budgetsApi.deleteGoal(goal.id);
      setGoals((items) => items.filter((item) => item.id !== goal.id));
      showToast('Savings goal deleted.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete this goal.', 'error');
    } finally {
      setDeletingGoalId(null);
    }
  };

  const handleAddContribution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contributionGoal) return;
    const amountText = contributionAmount.trim();
    const amount = Number(amountText);
    if (
      !/^\d+(\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 9999999.99
    ) {
      showToast('Enter a contribution greater than zero with at most two decimal places.', 'error');
      return;
    }
    if (!contributionDate) {
      showToast('Choose a valid contribution date.', 'error');
      return;
    }
    if (contributionNote.trim().length > 300) {
      showToast('Contribution notes must be 300 characters or fewer.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await budgetsApi.contributeToGoal(contributionGoal.id, {
        amount,
        date: contributionDate,
        ...(contributionNote.trim() ? { note: contributionNote.trim() } : {}),
      });
      setGoals((items) => items.map((item) => item.id === updated.id ? updated : item));
      reloadNotifications();
      if (expandedHistoryId === contributionGoal.id) {
        await loadContributionHistory(contributionGoal.id, 1);
      }
      setContributionGoal(null);
      setContributionAmount('');
      setContributionDate(new Date().toISOString().slice(0, 10));
      setContributionNote('');
      showToast('Savings contribution added.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not add the contribution.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const loadContributionHistory = async (goalId: string, page = 1) => {
    setLoadingHistoryId(goalId);
    setHistoryErrors((errors) => ({ ...errors, [goalId]: '' }));
    try {
      const result = await budgetsApi.getGoalContributions(goalId, { page, limit: 5 });
      setContributionHistory((history) => ({ ...history, [goalId]: result.data }));
      setContributionHistoryMeta((metadata) => ({
        ...metadata,
        [goalId]: {
          page: result.meta.page,
          totalPages: result.meta.totalPages,
          total: result.meta.total,
        },
      }));
    } catch (cause) {
      setHistoryErrors((errors) => ({
        ...errors,
        [goalId]: cause instanceof Error ? cause.message : 'Could not load contribution history.',
      }));
    } finally {
      setLoadingHistoryId((current) => current === goalId ? null : current);
    }
  };

  const toggleContributionHistory = (goalId: string) => {
    if (expandedHistoryId === goalId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(goalId);
    void loadContributionHistory(goalId, 1);
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-navy-muted">
            <span>Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                if (event.target.value) setSelectedMonth(event.target.value);
              }}
              className="px-3 py-2 bg-white text-xs font-medium text-navy rounded-full border border-gray-200 focus:outline-none focus:border-primary"
            />
          </label>
          <button
            onClick={openNewBudgetModal}
            className="px-5 py-2.5 bg-white hover:bg-gray-50 text-navy text-xs font-bold rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Set Budget</span>
          </button>
          <button
            onClick={openNewGoalModal}
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
                Monthly Overall Budget ({new Date(`${selectedMonth}-01T00:00:00.000Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })})
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-navy mt-1">
                ${overallBudget.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <button
                type="button"
                onClick={() => void handleEditBudget(overallBudget)}
                disabled={loadingBudgetId === overallBudget.id || isSaving}
                className="mt-2 rounded-full px-3 py-1 text-[11px] font-bold text-primary hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingBudgetId === overallBudget.id ? 'Loading...' : 'Edit budget'}
              </button>
              <p className="text-xs text-navy/70 mt-1">
                ${overallBudget.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent so far ({overallPercentage.toFixed(1)}%)
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-bold ${overallStatus.color}`}>
                  {overallStatus.label}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteBudget(overallBudget)}
                  disabled={deletingBudgetId === overallBudget.id || isSaving}
                  className="rounded-full px-3 py-1 text-[11px] font-bold text-rose-600 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingBudgetId === overallBudget.id ? 'Deleting...' : 'Delete budget'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm p-4 rounded-3xl border border-white">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-navy-muted uppercase">Remaining Buffer</span>
                <span className="text-lg font-bold text-emerald-600">
                  ${overallBudget.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-8 w-px bg-purple-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-navy-muted uppercase">Alert Status</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${overallStatus.color}`}>
                  {overallPercentage >= 80
                    ? <AlertTriangle className="w-3.5 h-3.5" />
                    : <CheckCircle className="w-3.5 h-3.5" />}
                  {overallStatus.label}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <BudgetProgress
              spent={overallBudget.spent}
              total={overallBudget.amount}
              percentage={overallBudget.percentage}
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
                const spent = b.spent;
                const total = b.amount;
                const isOver80 = (b.percentage ?? 0) >= 80;
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

                    <BudgetProgress
                      spent={spent}
                      total={total}
                      percentage={b.percentage}
                      showLabels={false}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void handleEditBudget(b)}
                        disabled={loadingBudgetId === b.id || isSaving}
                        className="rounded-full px-3 py-1 text-[11px] font-bold text-primary hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingBudgetId === b.id ? 'Loading...' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteBudget(b)}
                        disabled={deletingBudgetId === b.id || isSaving}
                        className="rounded-full px-3 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deletingBudgetId === b.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
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
            <span className="text-xs text-primary font-bold">
              {goals.filter((goal) => !goal.isCompleted).length} Active
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {goals.length === 0 && (
              <div className="rounded-3xl border border-dashed border-purple-200 bg-[#F8F9FE] p-6 text-center">
                <Target className="mx-auto h-7 w-7 text-primary/60" />
                <p className="mt-2 text-sm font-bold text-navy">No savings goals yet</p>
                <p className="mt-1 text-xs text-navy-muted">Create a goal to start tracking your progress.</p>
              </div>
            )}
            {goals.map((goal) => {
              const pct = Math.min(Math.round(goal.percentage), 100);
              const historyPage = contributionHistoryMeta[goal.id];
              return (
                <div key={goal.id} className="p-4 border border-purple-50 rounded-3xl bg-white shadow-card-soft flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-navy">{goal.name}</h4>
                    <div className="flex items-center gap-2">
                      {goal.isCompleted && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          Completed
                        </span>
                      )}
                      <span className="text-xs font-bold text-primary">{pct}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-navy-muted">
                    <span>${goal.savedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} saved</span>
                    <span>Target: ${goal.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      Target: {goal.targetDate
                        ? new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString()
                        : 'No date'}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      ${goal.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setContributionGoal(goal)}
                      className="rounded-full border border-purple-100 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary-light"
                    >
                      Add savings
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleContributionHistory(goal.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-navy-muted hover:bg-gray-50"
                    >
                      <Clock className="h-3 w-3" />
                      {expandedHistoryId === goal.id ? 'Hide history' : 'History'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleEditGoal(goal)}
                      disabled={loadingGoalId === goal.id || isSaving}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary-light disabled:opacity-60"
                    >
                      <Pencil className="h-3 w-3" />
                      {loadingGoalId === goal.id ? 'Loading...' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteGoal(goal)}
                      disabled={deletingGoalId === goal.id || isSaving}
                      className="rounded-full px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingGoalId === goal.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  {expandedHistoryId === goal.id && (
                    <div className="mt-2 rounded-2xl bg-[#F8F9FE] p-3">
                      <h5 className="text-xs font-bold text-navy">Contribution history</h5>
                      {loadingHistoryId === goal.id && (
                        <p className="mt-2 text-xs text-navy-muted">Loading contributions...</p>
                      )}
                      {historyErrors[goal.id] && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs text-rose-600">{historyErrors[goal.id]}</p>
                          <button
                            type="button"
                            onClick={() => void loadContributionHistory(goal.id, historyPage?.page ?? 1)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {!loadingHistoryId &&
                        !historyErrors[goal.id] &&
                        (contributionHistory[goal.id]?.length ? (
                          <ul className="mt-2 divide-y divide-purple-100">
                            {contributionHistory[goal.id].map((contribution) => (
                              <li key={contribution.id} className="flex items-start justify-between gap-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-navy">
                                    {new Date(`${contribution.date}T00:00:00`).toLocaleDateString()}
                                  </p>
                                  {contribution.note && (
                                    <p className="mt-0.5 truncate text-[11px] text-navy-muted">{contribution.note}</p>
                                  )}
                                </div>
                                <span className="whitespace-nowrap text-xs font-bold text-emerald-700">
                                  +${contribution.amount.toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : contributionHistoryMeta[goal.id]?.total === 0 ? (
                          <p className="mt-2 text-xs text-navy-muted">No contributions recorded yet.</p>
                        ) : null)}
                      {historyPage && historyPage.totalPages > 1 && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-navy-muted">
                            Page {historyPage.page} of {historyPage.totalPages} · {historyPage.total} total
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={historyPage.page <= 1 || loadingHistoryId === goal.id}
                              onClick={() => void loadContributionHistory(goal.id, historyPage.page - 1)}
                              aria-label="Previous contributions"
                              className="rounded-full p-1 text-primary hover:bg-white disabled:opacity-40"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={historyPage.page >= historyPage.totalPages || loadingHistoryId === goal.id}
                              onClick={() => void loadContributionHistory(goal.id, historyPage.page + 1)}
                              aria-label="Next contributions"
                              className="rounded-full p-1 text-primary hover:bg-white disabled:opacity-40"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Set Budget Modal */}
      <Modal
        isOpen={isAddBudgetOpen}
        onClose={closeBudgetModal}
        title={editingBudget ? 'Edit Budget' : 'Set Budget Limit'}
        subtitle={editingBudget
          ? 'Update the budget amount, category, or month'
          : 'Configure monthly overall or category spending boundaries'}
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

          {editingBudget && (
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Budget Month</label>
              <input
                type="month"
                required
                value={budgetMonth}
                onChange={(e) => setBudgetMonth(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Budget Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="9999999.99"
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
              onClick={closeBudgetModal}
              className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New Savings Goal Modal */}
      <Modal
        isOpen={isAddGoalOpen}
        onClose={() => {
          setIsAddGoalOpen(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
        subtitle={editingGoal ? 'Update your goal details without changing its contribution history.' : 'Set a goal name, target amount, and optional target date.'}
      >
        <form onSubmit={handleSaveGoal} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Goal Name</label>
            <input
              type="text"
              required
              maxLength={100}
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Trip to Tokyo"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Target Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="9999999.99"
              required
              value={goalTargetAmount}
              onChange={(e) => setGoalTargetAmount(e.target.value)}
              placeholder="5000.00"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Target Date (optional)</label>
            <input
              type="date"
              value={goalTargetDate}
              onChange={(e) => setGoalTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsAddGoalOpen(false);
                setEditingGoal(null);
              }}
              className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
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
              max="9999999.99"
              required
              value={contributionAmount}
              onChange={(event) => setContributionAmount(event.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Contribution Date</label>
            <input
              type="date"
              required
              value={contributionDate}
              onChange={(event) => setContributionDate(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F8F9FE] px-4 py-2.5 text-xs font-medium text-navy"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Note (optional)</label>
            <textarea
              value={contributionNote}
              onChange={(event) => setContributionNote(event.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Add a note about this contribution"
              className="w-full resize-y rounded-2xl border border-gray-200 bg-[#F8F9FE] px-4 py-2.5 text-xs font-medium text-navy"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setContributionGoal(null)}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full disabled:opacity-60"
            >
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
