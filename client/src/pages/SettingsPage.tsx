import React, { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import {
  User,
  Mail,
  DollarSign,
  Globe,
  Lock,
  Bell,
  Trash2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { mockUser } from '../data/mockData';
import { authApi } from '../services/apiService';
import { getAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile fields (FR-07)
  const [name, setName] = useState(user?.name || mockUser.name);
  const [email, setEmail] = useState(user?.email || mockUser.email);
  const [monthlyIncome, setMonthlyIncome] = useState(String(user?.monthlyIncome ?? mockUser.monthlyIncome));
  const [currency, setCurrency] = useState(user?.currency || mockUser.currency);
  const [isSaving, setIsSaving] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications
  const [notify50, setNotify50] = useState(true);
  const [notify80, setNotify80] = useState(true);
  const [notify100, setNotify100] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Delete modal (FR-06)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setMonthlyIncome(String(user.monthlyIncome));
    setCurrency(user.currency);
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const income = Number(monthlyIncome);
    if (!Number.isFinite(income) || income < 0) {
      showToast('Monthly income must be a non-negative number.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const profile = { name: name.trim(), email: email.trim(), monthlyIncome: income, currency };
      if (getAccessToken()) await authApi.updateProfile(profile);
      updateUser(profile);
      showToast(
        email !== (user?.email || mockUser.email)
          ? 'Profile updated. A verification link has been sent to your new email (FR-07).'
          : 'Profile settings saved successfully!',
        email !== (user?.email || mockUser.email) ? 'info' : 'success',
      );
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save your profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must have at least 8 characters (FR-01).', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (!currentPassword) {
      showToast('Enter your current password.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed. Please sign in again for security.', 'success');
      await logout();
      navigate('/login');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not change your password.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      showToast('Type DELETE to confirm account removal.', 'error');
      return;
    }

    if (!getAccessToken()) {
      showToast('Sign in with a connected account before deleting it.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await authApi.deleteAccount();
      await logout();
      navigate('/');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete the account.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-navy-muted">
          Manage your personal profile, currency preferences, security credentials, and alert thresholds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile & Currency Form (FR-07) */}
        <div className="lg:col-span-7 bg-white rounded-4xl p-7 shadow-comet flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
              <User className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy">Profile Details</h3>
              <p className="text-xs text-navy-muted">Update your public name, email, and baseline income</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-navy-muted mt-1 block">
                Changing your email will dispatch a re-verification link (FR-07).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Monthly Income ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Primary Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-3 self-end px-7 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Security & Password */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-4xl p-7 shadow-comet flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Lock className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Change Password</h3>
                <p className="text-xs text-navy-muted">Keep your account secure with 8+ characters</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-navy mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F8F9FE] text-xs text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 letter & 1 number"
                  className="w-full px-4 py-2 bg-[#F8F9FE] text-xs text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F8F9FE] text-xs text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="mt-2 self-end px-6 py-2.5 bg-navy hover:bg-navy-dark text-white text-xs font-bold rounded-full transition-all"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Budget Threshold Notification Preferences (FR-16) */}
          <div className="bg-white rounded-4xl p-7 shadow-comet flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-navy">Budget Alert Notifications (FR-16)</h3>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-navy">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notify50}
                  onChange={(e) => setNotify50(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span>Notify at 50% threshold</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notify80}
                  onChange={(e) => setNotify80(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span>Notify at 80% threshold</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notify100}
                  onChange={(e) => setNotify100(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span>Notify at 100% threshold (Exceeded)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-gray-100">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-primary">Send email copy for all threshold alerts</span>
              </label>
            </div>
          </div>

          {/* Danger Zone: Delete Account (FR-06) */}
          <div className="p-6 rounded-4xl bg-rose-50 border border-rose-200 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider">Danger Zone</h4>
            </div>
            <p className="text-xs text-rose-800">
              Permanently delete your account, receipts, transactions, and budgets (FR-06).
            </p>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-all self-start"
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Permanent Account Deletion"
        subtitle="This action cannot be reverted."
      >
        <p className="text-xs text-navy/80 mb-3">
          To confirm, please type <strong className="text-rose-600 font-mono">DELETE</strong> in the input below:
        </p>
        <input
          type="text"
          value={deleteConfirmationText}
          onChange={(e) => setDeleteConfirmationText(e.target.value)}
          placeholder="DELETE"
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-navy mb-4 focus:outline-none"
        />
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-5 py-2 bg-gray-100 text-navy text-xs font-bold rounded-full"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAccount}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-sm"
          >
            Permanently Erase Everything
          </button>
        </div>
      </Modal>
    </AppShell>
  );
};
