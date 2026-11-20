import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  ShieldAlert,
  Users,
  UserCheck,
  UserX,
  FileText,
  CheckCircle,
  Search,
  Lock,
  Plus,
  Trash2,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { mockCategories } from '../../data/mockData';
import { adminApi } from '../../services/apiService';
import { getAccessToken } from '../../services/api';
import { ResourceStatus } from '../../components/common/ResourceStatus';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate: string;
  uploadsCount: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'categories'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Admin Users
  const [usersList, setUsersList] = useState<AdminUser[]>([
    {
      id: 'usr_01',
      name: 'Jonathan Ward',
      email: 'jonathan@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedDate: '2026-08-01',
      uploadsCount: 14,
    },
    {
      id: 'usr_02',
      name: 'Sarah Connor',
      email: 'sarah.c@techcorp.io',
      role: 'USER',
      status: 'ACTIVE',
      joinedDate: '2026-08-15',
      uploadsCount: 28,
    },
    {
      id: 'usr_03',
      name: 'Michael Chen',
      email: 'mchen.dev@gmail.com',
      role: 'USER',
      status: 'SUSPENDED',
      joinedDate: '2026-09-01',
      uploadsCount: 3,
    },
    {
      id: 'usr_04',
      name: 'Elena Rostova',
      email: 'elena@financehub.org',
      role: 'USER',
      status: 'ACTIVE',
      joinedDate: '2026-09-04',
      uploadsCount: 42,
    },
  ]);

  // Default Categories List (FR-37)
  const [defaultCats, setDefaultCats] = useState(mockCategories);
  const [stats, setStats] = useState({
    totalUsers: 1248,
    activeUsers: 984,
    totalUploads: 3420,
    ocrSuccessRate: 91.4,
  });
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#9275F5');
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextStats, users, categories] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getDefaultCategories(),
      ]);
      setStats(nextStats);
      setUsersList(users.map((user: Omit<AdminUser, 'uploadsCount' | 'joinedDate'> & { createdAt: string }) => ({
        ...user,
        joinedDate: user.createdAt.slice(0, 10),
        uploadsCount: 0,
      })));
      setDefaultCats(categories);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'The server request failed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }

    void loadAdminData();
  }, [loadAdminData]);

  const toggleUserStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      if (getAccessToken()) await adminApi.updateUserStatus(user.id, nextStatus);
      setUsersList((items) => items.map((item) => item.id === user.id ? { ...item, status: nextStatus } : item));
      showToast(
        getAccessToken()
          ? `User ${user.name} is now ${nextStatus} (FR-36).`
          : `Demo mode: ${user.name}'s status changed locally and was not saved.`,
        'info'
      );
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not update this user.', 'error');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      if (getAccessToken()) await adminApi.deleteUser(userId);
      setUsersList((items) => items.filter((user) => user.id !== userId));
      showToast(
        getAccessToken() ? 'User account successfully removed (FR-36).' : 'Demo mode: user removed locally; no server changes were made.',
        getAccessToken() ? 'success' : 'info'
      );
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete this user.', 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSaving(true);
    try {
      const newCategory = getAccessToken()
        ? await adminApi.createDefaultCategory({ name: newCatName.trim(), color: newCatColor })
        : {
            id: `cat_${Date.now()}`,
            name: newCatName.trim(),
            isDefault: true,
            color: newCatColor,
            icon: 'Tag',
          };
      setDefaultCats((items) => [...items, newCategory]);
      showToast(
        getAccessToken()
          ? `Platform default category "${newCatName}" added (FR-37)!`
          : 'Demo mode: category added locally and was not saved.',
        getAccessToken() ? 'success' : 'info'
      );
      setIsAddCatModalOpen(false);
      setNewCatName('');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not add this category.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell isAdmin={true}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight flex items-center gap-2">
            <span>Admin Operator Portal</span>
            <ShieldAlert className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-xs text-navy-muted mt-0.5">
            System health, user accounts management, and default categories configuration.
          </p>
        </div>

        {/* FR-38 Privacy Rule Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 text-primary border border-purple-200 rounded-full text-xs font-bold shadow-sm">
          <Lock className="w-4 h-4" />
          <span>Strict Privacy Barrier: Zero Transaction Access (FR-38)</span>
        </div>
      </div>

      {getAccessToken() && (
        <ResourceStatus
          isLoading={isLoading}
          error={loadError}
          onRetry={() => void loadAdminData()}
        />
      )}
      {!getAccessToken() && (
        <div role="status" className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-900">
          Showing sample admin data. Changes are local and will not be saved to a server.
        </div>
      )}

      {/* Admin KPIs Grid (FR-35) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy-muted">Total Users</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">{stats.totalUsers.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-emerald-600 mt-1 block">Registered accounts</span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-primary-light text-primary flex items-center justify-center">
            <Users className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        <div className="bg-card-blue rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Active Users</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">{stats.activeUsers.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-navy/80 mt-1 block">
              {stats.totalUsers ? `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% active` : 'No users'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-white text-primary flex items-center justify-center shadow-sm">
            <UserCheck className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        <div className="bg-card-lavender rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy/70">Receipt Uploads</span>
            <h3 className="text-2xl font-extrabold text-navy mt-1">{stats.totalUploads.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-navy/80 mt-1 block">Total images stored</span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-white text-primary flex items-center justify-center shadow-sm">
            <FileText className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        <div className="bg-white rounded-4xl p-6 shadow-comet flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-navy-muted">OCR Success Rate</span>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.ocrSuccessRate}%</h3>
            <span className="text-[11px] text-navy-muted mt-1 block">Target &gt; 85% (FR-19)</span>
          </div>
          <div className="w-12 h-12 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* Tabs & Controls Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-comet flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#F8F9FE] p-1 rounded-full border border-gray-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-primary text-white shadow-comet-glow'
                : 'text-navy-muted hover:text-navy'
            }`}
          >
            User Accounts (FR-36)
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-primary text-white shadow-comet-glow'
                : 'text-navy-muted hover:text-navy'
            }`}
          >
            Default Categories (FR-37)
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user name or email..."
              className="w-full pl-9 pr-4 py-1.5 bg-[#F8F9FE] text-xs text-navy rounded-full border border-gray-200 focus:outline-none focus:border-primary/40"
            />
            <Search className="w-3.5 h-3.5 text-navy-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        )}

        {activeTab === 'categories' && (
          <button
            onClick={() => setIsAddCatModalOpen(true)}
            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-full shadow-comet-glow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Default Category</span>
          </button>
        )}
      </div>

      {/* Tab 1: Users Management (FR-36) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-4xl p-6 sm:p-7 shadow-comet overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-gray-100 text-[11px] font-bold text-navy-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Receipts</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-navy-light/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-navy">{user.name}</div>
                      <div className="text-[10px] text-navy-muted">{user.email}</div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-navy">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-primary'
                            : 'bg-gray-100 text-navy'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-navy-muted font-medium">
                      {user.joinedDate}
                    </td>

                    <td className="py-3.5 px-4 text-navy font-bold">
                      {user.uploadsCount} files
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => void toggleUserStatus(user)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            user.status === 'ACTIVE'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-1.5 text-navy-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-navy-muted">
                      No users match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Default Categories Manager (FR-37) */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-4xl p-6 sm:p-7 shadow-comet flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {defaultCats.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-3xl border border-gray-100 flex items-center justify-between bg-[#F8F9FE]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cat.color || '#9275F5' }}
                  />
                  <span className="text-xs font-bold text-navy">{cat.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-navy-muted bg-white px-2 py-0.5 rounded-full border">
                  Default
                </span>
              </div>
            ))}
            {defaultCats.length === 0 && (
              <p className="col-span-full py-8 text-center text-xs text-navy-muted">
                No default categories are configured.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Default Category Modal */}
      <Modal
        isOpen={isAddCatModalOpen}
        onClose={() => setIsAddCatModalOpen(false)}
        title="Add System Default Category"
        subtitle="This category will be pre-loaded for all registered accounts (FR-37)."
      >
        <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Category Name</label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Subscriptions & SaaS"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Hex Color Tag</label>
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-16 h-10 p-1 bg-transparent rounded-xl cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddCatModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-navy text-xs font-bold rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Default Category'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};
