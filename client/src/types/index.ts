export type Role = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type RecurringFrequency = 'NONE' | 'WEEKLY' | 'MONTHLY';

export type InsightSource = 'AI' | 'RULE';
export type OcrStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  currency: string;
  monthlyIncome: number;
  isVerified: boolean;
  status: UserStatus;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  userId?: string | null;
  color?: string;
  icon?: string;
}

export interface Income {
  id: string;
  userId: string;
  source: string;
  amount: number;
  date: string;
  description?: string;
  recurring?: RecurringFrequency;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  title: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod | null;
  description?: string;
  recurring?: RecurringFrequency;
  receiptId?: string;
  receipt?: Receipt;
  createdAt: string;
  updatedAt?: string;
}

export interface UnifiedTransaction {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  categoryId?: string;
  category?: Category;
  paymentMethod?: PaymentMethod | null;
}

export interface Receipt {
  id: string;
  expenseId?: string;
  fileUrl: string;
  fileKey?: string;
  ocrVendor?: string;
  ocrDate?: string;
  ocrAmount?: number;
  ocrStatus: OcrStatus;
  rawOcrText?: string;
  uploadedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string | null;
  category?: Category;
  month: string; // YYYY-MM
  amount: number;
  spent?: number;
  percentage?: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string | null;
  color?: string;
  remainingAmount?: number;
  percentage?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface InsightItem {
  id: string;
  userId: string;
  period: string;
  text: string;
  source: InsightSource;
  createdAt: string;
}

export interface DashboardMetrics {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  budgetUsagePercentage: number;
  totalBudget: number;
  currency: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface CategoryBreakdown {
  totalExpenses: number;
  categories: CategoryBreakdownItem[];
}

export interface AnalyticsTrends {
  monthly: Array<{ month: string; income: number; expense: number }>;
  daily: Array<{ date: string; expense: number }>;
}
