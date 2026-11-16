import React, { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { useToast } from '../components/common/Toast';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Download,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import {
  mockExpenses,
  mockIncomes,
  mockCategories,
  mockBudgets,
  mockSavingsGoals,
} from '../data/mockData';
import { analyticsApi } from '../services/apiService';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');

  const totalIncome = mockIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = mockExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // CSV Export with Formula Injection Neutralization (FR-28, FR-29)
  const handleExportCsv = async () => {
    try {
      const blob = await analyticsApi.exportCsv(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ExpenseAI_Financial_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Formula-safe CSV report downloaded from server (FR-28, FR-29)!', 'success');
    } catch {
      // Client-side fallback if server offline
      const sanitize = (val: string | number) => {
        const str = String(val).trim();
        if (/^[=+\-@]/.test(str)) return `'${str}`;
        return `"${str.replace(/"/g, '""')}"`;
      };

      const headers = ['Date', 'Type', 'Category/Source', 'Amount', 'Payment Method', 'Description'];
      const rows: string[][] = [];

      mockIncomes.forEach((i) => {
        rows.push([i.date.split('T')[0], 'Income', i.source, i.amount.toFixed(2), 'Direct Deposit', i.description || '']);
      });

      mockExpenses.forEach((e) => {
        const cat = mockCategories.find((c) => c.id === e.categoryId);
        rows.push([e.date.split('T')[0], 'Expense', cat?.name || 'General', e.amount.toFixed(2), e.paymentMethod, e.description || '']);
      });

      const csvContent = [headers.map(sanitize).join(','), ...rows.map((row) => row.map(sanitize).join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ExpenseAI_Financial_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Formula-safe CSV report downloaded successfully (FR-28, FR-29)!', 'success');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Monthly Financial Reports
          </h1>
          <p className="text-xs text-navy-muted mt-0.5">
            Official monthly statements, print-friendly formatting, and formula-safe CSV data export (FR-26 to FR-29).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-white hover:bg-gray-50 text-navy text-xs font-bold rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Report (FR-27)</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range & Controls Filter Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-comet flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-navy">Reporting Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-[#F8F9FE] border border-gray-200 rounded-full text-xs font-semibold text-navy focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Formula Injection Protected (FR-29)</span>
        </div>
      </div>

      {/* Printable Report Document Body */}
      <div className="bg-white rounded-4xl p-8 sm:p-10 shadow-comet flex flex-col gap-8 print:shadow-none print:p-0 print:border-none">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-6">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              EXPENSEAI STATEMENT
            </span>
            <h2 className="text-2xl font-black text-navy mt-1">
              Monthly Financial Overview
            </h2>
            <p className="text-xs text-navy-muted mt-0.5">
              Period: September 1, 2026 – September 30, 2026
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-navy">Account Holder</span>
            <p className="text-xs text-navy-muted">Jonathan W.</p>
            <p className="text-[10px] text-navy-muted">ID: usr_01j789012345</p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4" />
              Total Credits / Income
            </span>
            <span className="text-2xl font-black text-emerald-900 mt-2">
              ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-100 flex flex-col">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              Total Debits / Expenses
            </span>
            <span className="text-2xl font-black text-rose-900 mt-2">
              ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-purple-50 border border-purple-100 flex flex-col">
            <span className="text-xs font-bold text-purple-900">
              Net Surplus / Savings
            </span>
            <span className="text-2xl font-black text-primary mt-2">
              +${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Budget vs Actual Performance Table */}
        <div>
          <h3 className="text-sm font-bold text-navy mb-3">Budget vs. Actual Variance</h3>
          <div className="border border-gray-100 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FE] text-[11px] font-bold text-navy-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Allocated Budget</th>
                  <th className="py-3 px-4">Actual Spend</th>
                  <th className="py-3 px-4 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockBudgets.map((b) => {
                  const spent = b.spent || 0;
                  const variance = b.amount - spent;
                  return (
                    <tr key={b.id}>
                      <td className="py-3 px-4 font-bold text-navy">
                        {b.category?.name || 'Overall Monthly Limit'}
                      </td>
                      <td className="py-3 px-4 text-navy-muted">${b.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-navy">${spent.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Savings Goals Status */}
        <div>
          <h3 className="text-sm font-bold text-navy mb-3">Savings Goals Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {mockSavingsGoals.map((g) => (
              <div key={g.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                <span className="font-bold text-navy">{g.name}</span>
                <p className="text-navy-muted mt-1">
                  ${g.savedAmount.toLocaleString()} of ${g.targetAmount.toLocaleString()} ({Math.round((g.savedAmount / g.targetAmount) * 100)}%)
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-navy-muted">
          <span>Generated automatically by ExpenseAI Smart Personal Finance Platform</span>
          <span>Confidential Personal Statement</span>
        </div>
      </div>
    </AppShell>
  );
};
