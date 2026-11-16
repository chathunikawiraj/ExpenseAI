import { apiRequest, setAccessToken } from './api';
import { User, Expense, Income, Category, Budget, SavingsGoal, InsightItem, NotificationItem } from '../types';

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
    return apiRequest('/auth/account', { method: 'DELETE' });
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
  async getIncomes(params: { startDate?: string; endDate?: string; source?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams(params as any).toString();
    return apiRequest<{ data: Income[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/incomes?${q}`
    );
  },

  async createIncome(data: Partial<Income>) {
    return apiRequest<Income>('/incomes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteIncome(id: string) {
    return apiRequest(`/incomes/${id}`, { method: 'DELETE' });
  },

  async getExpenses(params: { search?: string; categoryId?: string; paymentMethod?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams(params as any).toString();
    return apiRequest<{ data: Expense[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/expenses?${q}`
    );
  },

  async createExpense(data: Partial<Expense>) {
    return apiRequest<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteExpense(id: string) {
    return apiRequest(`/expenses/${id}`, { method: 'DELETE' });
  },

  async getCategories(): Promise<Category[]> {
    return apiRequest('/categories');
  },

  async createCategory(data: { name: string; color?: string; icon?: string }): Promise<Category> {
    return apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
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

  async deleteBudget(id: string) {
    return apiRequest(`/budgets/${id}`, { method: 'DELETE' });
  },

  async getGoals(): Promise<SavingsGoal[]> {
    return apiRequest('/goals');
  },

  async createGoal(data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    return apiRequest('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
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
};

export const receiptsApi = {
  async uploadAndOcr(file: File) {
    const formData = new FormData();
    formData.append('receipt', file);
    return apiRequest<{
      receiptId: string;
      fileUrl: string;
      extracted: {
        vendor: string | null;
        date: string | null;
        amount: number | null;
        suggestedCategoryId: string;
        success: boolean;
      };
    }>('/receipts', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteReceipt(id: string) {
    return apiRequest(`/receipts/${id}`, { method: 'DELETE' });
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
  async getSummary(month?: string) {
    const q = month ? `?month=${month}` : '';
    return apiRequest(`/analytics/summary${q}`);
  },

  async getTrends() {
    return apiRequest('/analytics/trends');
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
