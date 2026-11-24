import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppShell } from '../components/layout/AppShell';
import { Modal } from '../components/common/Modal';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { useToast } from '../components/common/Toast';
import {
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Tags,
} from 'lucide-react';
import { Expense, Income, PaymentMethod } from '../types';
import { transactionsApi } from '../services/apiService';
import { ResourceStatus } from '../components/common/ResourceStatus';

interface TransactionRow {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
  category?: string;
  categoryColor?: string;
  categoryId?: string;
  paymentMethod?: string;
  description?: string;
  createdAt: string;
}

export const TransactionsPage: React.FC = () => {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'all' | 'expenses' | 'incomes'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [incomesList, setIncomesList] = useState<Income[]>([]);
  const [unifiedList, setUnifiedList] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof transactionsApi.getCategories>>>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshCount, setRefreshCount] = useState(0);
  const requestVersion = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'expense' | 'income' } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; type: 'expense' | 'income' } | null>(null);

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('DEBIT_CARD');
  const [formDescription, setFormDescription] = useState('');

  const loadTransactions = useCallback(async () => {
    const pageLimit = itemsPerPage;
    const commonParams = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchTerm.trim() || undefined,
      sortBy,
      order: sortOrder,
      page: currentPage,
      limit: pageLimit,
    };
    const emptyPage = {
      data: [],
      meta: { total: 0, page: currentPage, limit: pageLimit, totalPages: 0 },
    };
    const requestId = ++requestVersion.current;
    const isCurrentRequest = () => requestVersion.current === requestId;
    setIsLoading(true);
    setLoadError(null);
    try {
      if (activeTab === 'all') {
        const transactionType =
          selectedCategory === 'income'
            ? 'income'
            : selectedCategory !== 'all' || selectedPaymentMethod !== 'all'
              ? 'expense'
              : 'all';
        const [transactions, nextCategories] = await Promise.all([
          transactionsApi.getTransactions({
            ...commonParams,
            type: transactionType,
            categoryId: selectedCategory === 'all' || selectedCategory === 'income'
              ? undefined
              : selectedCategory,
            paymentMethod: selectedPaymentMethod === 'all'
              ? undefined
              : selectedPaymentMethod,
          }),
          transactionsApi.getCategories(),
        ]);
        if (!isCurrentRequest()) return;
        setUnifiedList(transactions.data.map((transaction) => ({
          id: transaction.id,
          title: transaction.title,
          amount: transaction.amount,
          date: transaction.date,
          type: transaction.type,
          category: transaction.category?.name || (transaction.type === 'income' ? 'Income' : 'Uncategorized'),
          categoryColor: transaction.category?.color || (transaction.type === 'income' ? '#4BC9A2' : '#9275F5'),
          categoryId: transaction.categoryId,
          paymentMethod: transaction.paymentMethod ?? undefined,
          description: transaction.description,
          createdAt: transaction.createdAt,
        })));
        setExpensesList([]);
        setIncomesList([]);
        setCategories(nextCategories);
        setTotalRecords(transactions.meta.total);
        setTotalPages(Math.max(1, transactions.meta.totalPages));
        if (!categories.length && nextCategories.length) {
          setFormCategory((current) => current || nextCategories[0].id);
        }
        return;
      }

      const includeExpenses = activeTab === 'expenses';
      const includeIncomes = activeTab === 'incomes';
      const [expenses, incomes, nextCategories] = await Promise.all([
        includeExpenses
          ? transactionsApi.getExpenses({
              ...commonParams,
              categoryId: selectedCategory === 'all' || selectedCategory === 'income'
                ? undefined
                : selectedCategory,
              paymentMethod: selectedPaymentMethod === 'all' ? undefined : selectedPaymentMethod,
            })
          : Promise.resolve(emptyPage),
        includeIncomes
          ? transactionsApi.getIncomes(commonParams)
          : Promise.resolve(emptyPage),
        transactionsApi.getCategories(),
      ]);
      if (!isCurrentRequest()) return;
      setExpensesList(expenses.data);
      setIncomesList(incomes.data);
      setCategories(nextCategories);
      setTotalRecords(expenses.meta.total + incomes.meta.total);
      setTotalPages(Math.max(1, expenses.meta.totalPages, incomes.meta.totalPages));
      if (!categories.length && nextCategories.length) {
        setFormCategory((current) => current || nextCategories[0].id);
      }
    } catch (cause) {
      if (isCurrentRequest()) {
        setLoadError(cause instanceof Error ? cause.message : 'The server request failed.');
        setExpensesList([]);
        setIncomesList([]);
        setUnifiedList([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } finally {
      if (isCurrentRequest()) setIsLoading(false);
    }
  }, [
    activeTab,
    categories.length,
    currentPage,
    endDate,
    itemsPerPage,
    searchTerm,
    selectedCategory,
    selectedPaymentMethod,
    sortBy,
    sortOrder,
    startDate,
  ]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, refreshCount]);

  // Combined list with unified fields
  const unifiedTransactions = useMemo(() => {
    if (activeTab === 'all') return unifiedList;

    const list: TransactionRow[] = [];

    expensesList.forEach((expense) => {
      const category = categories.find((item) => item.id === expense.categoryId) || expense.category;
      list.push({
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        date: expense.date,
        type: 'expense',
        category: category?.name || 'Uncategorized',
        categoryColor: category?.color || '#9275F5',
        categoryId: expense.categoryId,
        paymentMethod: expense.paymentMethod ?? undefined,
        description: expense.description ?? undefined,
        createdAt: expense.createdAt,
      });
    });

    incomesList.forEach((income) => {
      list.push({
        id: income.id,
        title: income.source,
        amount: income.amount,
        date: income.date,
        type: 'income',
        category: 'Income',
        categoryColor: '#4BC9A2',
        description: income.description ?? undefined,
        createdAt: income.createdAt,
      });
    });

    return list;
  }, [activeTab, unifiedList, expensesList, incomesList, categories]);

  const transactionSummary = useMemo(
    () =>
      unifiedTransactions.reduce(
        (summary, transaction) => {
          summary.count += 1;
          summary[transaction.type] += transaction.amount;
          return summary;
        },
        { count: 0, expense: 0, income: 0 },
      ),
    [unifiedTransactions],
  );
  const hasActiveFilters =
    activeTab !== 'all' ||
    searchTerm.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedPaymentMethod !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const clearFilters = () => {
    setActiveTab('all');
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Pagination calculation
  const page = Math.min(currentPage, totalPages);
  const currentItems = unifiedTransactions;

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast('Enter a transaction amount greater than zero.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (formType === 'expense') {
        const payload = {
          title: formTitle.trim(),
          amount: parsedAmount,
          date: formDate,
          categoryId: formCategory,
          paymentMethod: formPaymentMethod,
          description: formDescription.trim(),
        };
        if (!formCategory) {
          showToast('Create or choose an expense category first.', 'error');
          return;
        }
        if (editTarget?.type === 'expense') {
          await transactionsApi.updateExpense(editTarget.id, payload);
        } else {
          await transactionsApi.createExpense(payload);
        }
      } else {
        const payload = {
          source: formTitle.trim(),
          amount: parsedAmount,
          date: formDate,
          description: formDescription.trim(),
        };
        if (editTarget?.type === 'income') {
          await transactionsApi.updateIncome(editTarget.id, payload);
        } else {
          await transactionsApi.createIncome(payload);
        }
      }

      setIsAddModalOpen(false);
      setCurrentPage(1);
      setRefreshCount((count) => count + 1);
      showToast(`${editTarget ? 'Transaction updated' : 'Transaction added'} successfully.`, 'success');
      if (!editTarget) {
        setActiveTab('all');
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedPaymentMethod('all');
      }
      setCurrentPage(1);
      resetForm();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save this transaction.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (name.length < 2 || name.length > 80) {
      showToast('Category names must contain 2 to 80 characters.', 'error');
      return;
    }

    setIsCategorySaving(true);
    try {
      const created = await transactionsApi.createCategory({ name });
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setFormCategory(created.id);
      setCategoryName('');
      showToast('Category created successfully.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not create this category.', 'error');
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setIsCategorySaving(true);
    try {
      await transactionsApi.deleteCategory(id);
      setCategories((current) => current.filter((category) => category.id !== id));
      setFormCategory((current) => current === id ? '' : current);
      setSelectedCategory((current) => current === id ? 'all' : current);
      setRefreshCount((count) => count + 1);
      showToast('Category deleted successfully.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete this category.', 'error');
    } finally {
      setIsCategorySaving(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory(categories[0]?.id || '');
    setFormPaymentMethod('DEBIT_CARD');
    setFormType('expense');
    setEditTarget(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const startEditing = (transaction: TransactionRow) => {
    setEditTarget({ id: transaction.id, type: transaction.type });
    setFormType(transaction.type);
    setFormTitle(transaction.title);
    setFormAmount(String(transaction.amount));
    setFormDate(transaction.date.slice(0, 10));
    setFormDescription(transaction.description || '');

    if (transaction.type === 'expense') {
      if (transaction.categoryId) {
        setFormCategory(transaction.categoryId);
      }
      const expense = expensesList.find((item) => item.id === transaction.id);
      if (expense) {
        setFormCategory(expense.categoryId);
        setFormPaymentMethod(expense.paymentMethod ?? 'DEBIT_CARD');
      }
    }

    setIsAddModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'expense') await transactionsApi.deleteExpense(deleteTarget.id);
      else await transactionsApi.deleteIncome(deleteTarget.id);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      setRefreshCount((count) => count + 1);
      showToast('Transaction deleted.', 'success');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete this transaction.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell>
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Transactions
          </h1>
          <p className="text-xs text-navy-muted mt-0.5">
            Manage your daily expenses, salary credits, and invoices
          </p>
        </div>

        <ResourceStatus
          isLoading={isLoading}
          error={loadError}
          onRetry={() => setRefreshCount((count) => count + 1)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-5 py-3 bg-white hover:bg-primary-light text-primary text-xs font-bold rounded-full border border-purple-100 transition-all flex items-center gap-2"
          >
            <Tags className="w-4 h-4" />
            <span>Manage Categories</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-purple-100/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Matching records</p>
          <p className="mt-2 text-2xl font-extrabold text-navy">{totalRecords}</p>
          <p className="mt-1 text-[11px] text-navy-muted">Matching records across all pages</p>
        </div>
        <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-emerald-100/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Income</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            ${transactionSummary.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-navy-muted">Income on this page</p>
        </div>
        <div className="card-hover bg-white rounded-3xl p-5 shadow-comet border border-rose-100/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy-muted">Expenses</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-500">
            ${transactionSummary.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-navy-muted">Expenses on this page</p>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-comet flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-[#F8F9FE] p-1 rounded-full border border-gray-100">
            {(['all', 'expenses', 'incomes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedCategory('all');
                  setSelectedPaymentMethod('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-primary text-white shadow-comet-glow'
                    : 'text-navy-muted hover:text-navy'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              aria-label="Search transactions"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by title or notes..."
              className="w-full pl-9 pr-4 py-1.5 bg-[#F8F9FE] text-xs text-navy rounded-full border border-gray-200 focus:outline-none focus:border-primary/40"
            />
            <Search className="w-3.5 h-3.5 text-navy-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-navy-muted font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            disabled={activeTab === 'incomes'}
            className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs font-semibold text-navy focus:outline-none disabled:opacity-50"
          >
            <option value="all">All Categories</option>
            {activeTab === 'all' && <option value="income">Income</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Dropdown */}
          <select
            value={selectedPaymentMethod}
            onChange={(e) => {
              setSelectedPaymentMethod(e.target.value);
              setCurrentPage(1);
            }}
            disabled={activeTab === 'incomes'}
            className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs font-semibold text-navy focus:outline-none disabled:opacity-50"
          >
            <option value="all">All Payment Methods</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
          </select>

          <label className="flex items-center gap-2 text-navy-muted">
            <span>From</span>
            <input
              type="date"
              aria-label="Filter from date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs text-navy focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-navy-muted">
            <span>To</span>
            <input
              type="date"
              aria-label="Filter to date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs text-navy focus:outline-none"
            />
          </label>

          {/* Sorting Order */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-navy-muted font-medium">Sort:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                sortBy === 'date'
                  ? 'bg-primary-light text-primary border-purple-200'
                  : 'bg-white text-navy-muted border-gray-200'
              }`}
            >
              Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('amount');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                sortBy === 'amount'
                  ? 'bg-primary-light text-primary border-purple-200'
                  : 'bg-white text-navy-muted border-gray-200'
              }`}
            >
              Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'createdAt') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('createdAt');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                sortBy === 'createdAt'
                  ? 'bg-primary-light text-primary border-purple-200'
                  : 'bg-white text-navy-muted border-gray-200'
              }`}
            >
              Created {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-navy-muted">
          <span>
            Showing {currentItems.length} of {totalRecords} matching records
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-bold text-primary hover:text-primary-hover transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / List Card */}
      <div className="bg-white rounded-4xl p-6 shadow-comet overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold text-navy-muted uppercase tracking-wider">
                <th className="py-3 px-4">Transaction</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              <AnimatePresence initial={false}>
                {currentItems.length > 0 ? (
                  currentItems.map((tx) => (
                    <motion.tr
                      key={tx.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.18 }}
                      className="hover:bg-navy-light/40 transition-colors group"
                    >
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'income'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-primary-light text-primary'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.2]" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-navy">{tx.title}</h4>
                        {tx.description && (
                          <p className="text-[10px] text-navy-muted line-clamp-1">{tx.description}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <CategoryBadge
                        name={tx.category || 'General'}
                        color={tx.categoryColor || '#9275F5'}
                      />
                    </td>

                    <td className="py-3.5 px-4 text-navy font-medium">
                      {new Date(tx.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-navy-muted capitalize">
                      {tx.paymentMethod ? tx.paymentMethod.replace('_', ' ').toLowerCase() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-extrabold text-sm ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-navy'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}$
                        {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(tx)}
                          className="p-1.5 text-navy-muted hover:text-primary rounded-lg hover:bg-primary-light transition-colors"
                          title="Edit transaction"
                          aria-label={`Edit ${tx.title}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget({ id: tx.id, type: tx.type });
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-navy-muted hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete transaction"
                          aria-label={`Delete ${tx.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr
                    key="empty"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  >
                    <td colSpan={6} className="text-center py-10 text-navy-muted">
                      <p>{hasActiveFilters ? 'No matching transactions found.' : 'No transactions yet.'}</p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-2 font-bold text-primary hover:text-primary-hover transition-colors"
                        >
                          Clear filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={openAddModal}
                          className="mt-2 font-bold text-primary hover:text-primary-hover transition-colors"
                        >
                          Add your first transaction
                        </button>
                      )}
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Results are fetched using the backend's pagination metadata. */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 text-xs">
          <span className="text-navy-muted">
            {currentItems.length} records on this page · {totalRecords} total matching records
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-navy px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          if (!isCategorySaving) setIsCategoryModalOpen(false);
        }}
        title="Manage Categories"
        subtitle="Default categories are shared; custom categories belong to your account."
      >
        <form onSubmit={handleCreateCategory} className="flex gap-2">
          <input
            type="text"
            maxLength={80}
            required
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="New category name"
            className="min-w-0 flex-1 px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isCategorySaving}
            className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-full disabled:opacity-60"
          >
            Add
          </button>
        </form>
        <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-gray-100">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-navy">{category.name}</p>
                <p className="text-[10px] text-navy-muted">
                  {category.isDefault ? 'Default category' : 'Custom category'}
                </p>
              </div>
              {!category.isDefault && (
                <button
                  type="button"
                  disabled={isCategorySaving}
                  onClick={() => void handleDeleteCategory(category.id)}
                  className="p-2 text-navy-muted hover:text-rose-500 disabled:opacity-50"
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="py-5 text-center text-xs text-navy-muted">No categories are available.</p>
          )}
        </div>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title={editTarget ? 'Edit Transaction' : 'Add New Transaction'}
        subtitle={editTarget ? 'Update the transaction details below' : 'Record manual income or an expense item'}
      >
        <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4">
          {/* Transaction Type Radio Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => setFormType('expense')}
              disabled={Boolean(editTarget)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                formType === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-navy-muted hover:text-navy'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setFormType('income')}
              disabled={Boolean(editTarget)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                formType === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-navy-muted hover:text-navy'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">
              {formType === 'expense' ? 'Title / Payee' : 'Income Source'}
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={formType === 'expense' ? 'e.g. Grocery Market' : 'e.g. Freelance Consulting'}
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Date</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {formType === 'expense' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Payment Method</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                >
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Notes / Description (Optional)</label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Add optional transaction reference or notes"
              className="w-full px-4 py-2 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy text-xs font-bold rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all"
            >
              {isSaving ? 'Saving...' : editTarget ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Transaction"
        subtitle="This action cannot be undone."
      >
        <p className="text-xs text-navy/80">
          Are you sure you want to permanently delete this transaction record?
        </p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-5 py-2 bg-gray-100 text-navy text-xs font-bold rounded-full"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={isDeleting}
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-full shadow-sm"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </AppShell>
  );
};
