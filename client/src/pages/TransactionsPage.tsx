import React, { useState, useMemo } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Modal } from '../components/common/Modal';
import { CategoryBadge } from '../components/common/CategoryBadge';
import {
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Receipt
} from 'lucide-react';
import {
  mockExpenses,
  mockIncomes,
  mockCategories,
} from '../data/mockData';
import { Expense, Income, PaymentMethod } from '../types';

export const TransactionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'expenses' | 'incomes'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Local state for interactive CRUD
  const [expensesList, setExpensesList] = useState<Expense[]>(mockExpenses);
  const [incomesList, setIncomesList] = useState<Income[]>(mockIncomes);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'expense' | 'income' } | null>(null);

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState(mockCategories[0].id);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('DEBIT_CARD');
  const [formDescription, setFormDescription] = useState('');

  // Combined list with unified fields
  const unifiedTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      amount: number;
      date: string;
      type: 'expense' | 'income';
      category?: string;
      categoryColor?: string;
      paymentMethod?: string;
      description?: string;
    }> = [];

    if (activeTab === 'all' || activeTab === 'expenses') {
      expensesList.forEach((e) => {
        const cat = mockCategories.find((c) => c.id === e.categoryId) || e.category;
        list.push({
          id: e.id,
          title: e.title,
          amount: e.amount,
          date: e.date,
          type: 'expense',
          category: cat?.name || 'Uncategorized',
          categoryColor: cat?.color || '#9275F5',
          paymentMethod: e.paymentMethod,
          description: e.description,
        });
      });
    }

    if (activeTab === 'all' || activeTab === 'incomes') {
      incomesList.forEach((i) => {
        list.push({
          id: i.id,
          title: i.source,
          amount: i.amount,
          date: i.date,
          type: 'income',
          category: 'Income',
          categoryColor: '#4BC9A2',
          paymentMethod: 'Direct Deposit',
          description: i.description,
        });
      });
    }

    // Filter by search
    let filtered = list.filter((t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filter by Category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by Payment method
    if (selectedPaymentMethod !== 'all') {
      filtered = filtered.filter((t) => t.paymentMethod === selectedPaymentMethod);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === 'desc' ? diff : -diff;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return filtered;
  }, [activeTab, expensesList, incomesList, searchTerm, selectedCategory, selectedPaymentMethod, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(unifiedTransactions.length / itemsPerPage));
  const currentItems = unifiedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (formType === 'expense') {
      const newExp: Expense = {
        id: `exp_${Date.now()}`,
        userId: 'usr_01j7890123456789abcdef01',
        title: formTitle,
        amount: parsedAmount,
        date: formDate,
        categoryId: formCategory,
        category: mockCategories.find((c) => c.id === formCategory),
        paymentMethod: formPaymentMethod,
        description: formDescription,
        recurring: 'NONE',
        createdAt: new Date().toISOString(),
      };
      setExpensesList([newExp, ...expensesList]);
    } else {
      const newInc: Income = {
        id: `inc_${Date.now()}`,
        userId: 'usr_01j7890123456789abcdef01',
        source: formTitle,
        amount: parsedAmount,
        date: formDate,
        description: formDescription,
        recurring: 'NONE',
        createdAt: new Date().toISOString(),
      };
      setIncomesList([newInc, ...incomesList]);
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormTitle('');
    setFormAmount('');
    setFormDescription('');
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'expense') {
      setExpensesList(expensesList.filter((e) => e.id !== deleteTarget.id));
    } else {
      setIncomesList(incomesList.filter((i) => i.id !== deleteTarget.id));
    }
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
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

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Transaction</span>
        </button>
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
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs font-semibold text-navy focus:outline-none"
          >
            <option value="all">All Categories</option>
            {mockCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Dropdown */}
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs font-semibold text-navy focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="DEBIT_CARD">Debit Card</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
          </select>

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
          </div>
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
              {currentItems.length > 0 ? (
                currentItems.map((tx) => (
                  <tr key={tx.id} className="hover:bg-navy-light/40 transition-colors group">
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
                          onClick={() => {
                            setDeleteTarget({ id: tx.id, type: tx.type });
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-navy-muted hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-navy-muted">
                    No matching transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (20 items per page according to FR-09, FR-11) */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 text-xs">
          <span className="text-navy-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, unifiedTransactions.length)} of{' '}
            {unifiedTransactions.length} records (20 / page)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-navy px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Transaction"
        subtitle="Record manual income or an expense item"
      >
        <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4">
          {/* Transaction Type Radio Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => setFormType('expense')}
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
                  {mockCategories.map((c) => (
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
              onClick={() => setIsAddModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy text-xs font-bold rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all"
            >
              Save Transaction
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
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-full shadow-sm"
          >
            Delete
          </button>
        </div>
      </Modal>
    </AppShell>
  );
};
