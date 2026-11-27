import { apiRequest, setAccessToken } from './api';
import { User, Expense, Income, Category, Budget, SavingsGoal, SavingsContributionHistory, InsightItem, NotificationItem, UnifiedTransaction, DashboardSummary, CategoryBreakdown, AnalyticsTrends, Receipt } from '../types';

interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ListResponse<T> {
  data: T[];
  meta: PageMeta;
}

interface ReceiptScanResult {
  receiptId: string;
  fileUrl: string;
  ocrStatus: Receipt['ocrStatus'];
  confidence: number | null;
  manualEntryRequired: boolean;
  extracted: {
    vendor: string | null;
    date: string | null;
    amount: number | null;
    suggestedCategoryId: string | null;
  };
  receipt: Receipt;
}

interface TransactionQuery {
  type?: 'all' | 'income' | 'expense';
  startDate?: string;
  endDate?: string;
  search?: string;
  categoryId?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'createdAt';
  order?: 'asc' | 'desc';
  sortOrder?: 'asc' | 'desc';
}

const queryString = (params: object): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const authApi = {
  async register(data: { name: string; email: string; password: string; currency?: string; monthlyIncome?: number }) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.accessToken) setAccessToken(res.accessToken);
    return res;
  },

  async login(credentials: { email: string; password: string }) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.accessToken) setAccessToken(res.accessToken);
    return res;
  },

  async logout() {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setAccessToken(null);
  },

  async verifyEmail(token: string) {
    return apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async resendVerificationEmail(email: string) {
    return apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getMe(): Promise<User> {
    return apiRequest('/auth/me');
  },

  async updateProfile(data: { name?: string; email?: string; monthlyIncome?: number; currency?: string }) {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAccount() {
    return apiRequest('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async forgotPassword(email: string) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

export const transactionsApi = {
  async getTransactions(
    params: TransactionQuery = {},
  ): Promise<ListResponse<UnifiedTransaction>> {
    return apiRequest<ListResponse<UnifiedTransaction>>(`/transactions${queryString(params)}`);
  },

  async getIncomes(params: TransactionQuery & { source?: string } = {}): Promise<ListResponse<Income>> {
    return apiRequest<ListResponse<Income>>(`/incomes${queryString(params)}`);
  },

  async getIncome(id: string) {
    return apiRequest<Income>(`/incomes/${id}`);
  },

  async createIncome(data: Pick<Income, 'source' | 'amount' | 'date'> & { description?: string }) {
    return apiRequest<Income>('/incomes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIncome(id: string, data: Partial<Pick<Income, 'source' | 'amount' | 'date' | 'description'>>) {
    return apiRequest<Income>(`/incomes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteIncome(id: string) {
    return apiRequest(`/incomes/${id}`, { method: 'DELETE' });
  },

  async getExpenses(
    params: TransactionQuery & { categoryId?: string; paymentMethod?: string } = {},
  ): Promise<ListResponse<Expense>> {
    return apiRequest<ListResponse<Expense>>(`/expenses${queryString(params)}`);
  },

  async getExpense(id: string) {
    return apiRequest<Expense>(`/expenses/${id}`);
  },

  async createExpense(data: Pick<Expense, 'title' | 'amount' | 'date' | 'categoryId'> & {
    paymentMethod?: Expense['paymentMethod'];
    description?: string;
  }) {
    return apiRequest<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateExpense(id: string, data: Partial<Pick<Expense, 'title' | 'amount' | 'date' | 'categoryId' | 'paymentMethod' | 'description'>>) {
    return apiRequest<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteExpense(id: string) {
    return apiRequest(`/expenses/${id}`, { method: 'DELETE' });
  },

  async getCategories(): Promise<Category[]> {
    const response = await apiRequest<{ data: { categories: Category[] } }>('/categories');
    return response.data.categories;
  },

  async createCategory(data: { name: string }): Promise<Category> {
    const response = await apiRequest<{ data: { category: Category } }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.category;
  },

  async updateCategory(id: string, data: { name: string }): Promise<Category> {
    const response = await apiRequest<{ data: { category: Category } }>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data.category;
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

export const budgetsApi = {
  async getBudgets(month?: string): Promise<Budget[]> {
    const q = month ? `?month=${month}` : '';
    return apiRequest(`/budgets${q}`);
  },

  async createOrUpdateBudget(data: { categoryId?: string | null; month: string; amount: number }): Promise<Budget> {
    return apiRequest('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getBudget(id: string): Promise<Budget> {
    return apiRequest(`/budgets/${id}`);
  },

  async updateBudget(
    id: string,
    data: { categoryId?: string | null; month?: string; amount?: number },
  ): Promise<Budget> {
    return apiRequest(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteBudget(id: string) {
    return apiRequest(`/budgets/${id}`, { method: 'DELETE' });
  },

  async getGoals(): Promise<SavingsGoal[]> {
    return apiRequest('/goals');
  },

  async createGoal(
    data: Pick<SavingsGoal, 'name' | 'targetAmount'> &
      Partial<Pick<SavingsGoal, 'savedAmount'>> & { targetDate?: string },
  ): Promise<SavingsGoal> {
    return apiRequest('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getGoal(id: string): Promise<SavingsGoal> {
    return apiRequest(`/goals/${id}`);
  },

  async updateGoal(
    id: string,
    data: { name?: string; targetAmount?: number; targetDate?: string | null },
  ): Promise<SavingsGoal> {
    return apiRequest(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGoal(id: string) {
    return apiRequest(`/goals/${id}`, { method: 'DELETE' });
  },

  async getNotifications(): Promise<NotificationItem[]> {
    return apiRequest('/notifications');
  },

  async markNotificationRead(id: string) {
    return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return apiRequest('/notifications/read-all', { method: 'PATCH' });
  },

  async deleteNotification(id: string) {
    return apiRequest(`/notifications/${id}`, { method: 'DELETE' });
  },

  async getGoalContributions(
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<SavingsContributionHistory> {
    return apiRequest(`/goals/${id}/contributions${queryString(params)}`);
  },

  async contributeToGoal(
    id: string,
    data: { amount: number; date?: string; note?: string },
  ): Promise<SavingsGoal> {
    return apiRequest(`/goals/${id}/contributions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const receiptsApi = {
  async uploadAndOcr(file: File): Promise<ReceiptScanResult> {
    const formData = new FormData();
    formData.append('receipt', file);
    return apiRequest('/receipts/scan', {
      method: 'POST',
      body: formData,
    });
  },

  async confirmExpense(
    receiptId: string,
    expense: {
      title: string;
      amount: number;
      date: string;
      categoryId: string;
      paymentMethod: Expense['paymentMethod'];
      description?: string;
    },
  ): Promise<{ expense: Expense; receipt: Receipt }> {
    return apiRequest('/receipts/confirm', {
      method: 'POST',
      body: JSON.stringify({ receiptId, ...expense }),
    });
  },

  async getReceipt(id: string): Promise<Receipt> {
    return apiRequest<Receipt>(`/receipts/${id}`);
  },

  async getReceiptImage(id: string): Promise<Blob> {
    return apiRequest<Blob>(`/receipts/${id}/file`);
  },

  async replaceReceiptImage(id: string, file: File): Promise<ReceiptScanResult> {
    const formData = new FormData();
    formData.append('receipt', file);
    return apiRequest<ReceiptScanResult>(`/receipts/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  async deleteReceipt(id: string) {
    return apiRequest(`/receipts/${id}`, { method: 'DELETE' });
  },

  async associateReceipt(id: string, expenseId: string) {
    return apiRequest(`/receipts/${id}/associate`, {
      method: 'PATCH',
      body: JSON.stringify({ expenseId }),
    });
  },
};

export const insightsApi = {
  async getInsights(): Promise<InsightItem[]> {
    return apiRequest('/insights');
  },

  async generateInsights(period?: string): Promise<{ insight: InsightItem; disclaimer: string }> {
    return apiRequest('/insights/generate', {
      method: 'POST',
      body: JSON.stringify({ period }),
    });
  },
};

export const analyticsApi = {
  async getSummary(month?: string): Promise<DashboardSummary> {
    const q = month ? `?month=${month}` : '';
    return apiRequest(`/analytics/summary${q}`);
  },

  async getTrends(months = 6): Promise<AnalyticsTrends> {
    return apiRequest(`/analytics/trends?months=${months}`);
  },

  async getCategoryBreakdown(startDate?: string, endDate?: string): Promise<CategoryBreakdown> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    return apiRequest(`/analytics/category-breakdown${query ? `?${query}` : ''}`);
  },

  async getMonthlyReport(month: string) {
    return apiRequest(`/reports/${month}`);
  },

  async exportCsv(startDate?: string, endDate?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const q = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/export/csv${q}`);
  },
};

export const adminApi = {
  async getStats() {
    return apiRequest('/admin/stats');
  },

  async getUsers(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`/admin/users${q}`);
  },

  async updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return apiRequest(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteUser(id: string) {
    return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async getDefaultCategories(): Promise<Category[]> {
    return apiRequest('/admin/categories');
  },

  async createDefaultCategory(data: { name: string; color?: string; icon?: string }) {
    return apiRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteDefaultCategory(id: string) {
    return apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
  },
};
