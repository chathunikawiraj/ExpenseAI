import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { Rocket, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      showToast('Password must be 8+ characters with a letter and a number (FR-01).', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    showToast('Your password has been successfully reset! Please sign in (FR-05).', 'success');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="bg-ambient-blobs" aria-hidden="true">
        <div className="blob-pink" />
        <div className="blob-lavender" />
        <div className="blob-blue" />
      </div>

      <div className="w-full max-w-md bg-white rounded-4xl p-8 sm:p-10 shadow-comet-lg border border-purple-50 relative z-10 flex flex-col items-center">
        <div className="w-14 h-14 rounded-3xl bg-primary-light text-primary flex items-center justify-center mb-4 shadow-sm">
          <Rocket className="w-7 h-7 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-black text-navy text-center">Set New Password</h2>
        <p className="text-xs text-navy-muted text-center mt-1">
          Valid for 30 minutes from request (FR-05).
        </p>

        <form onSubmit={handleReset} className="w-full flex flex-col gap-4 mt-6">
          <div>
            <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-navy-muted" />
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-navy-muted" />
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2"
          >
            <span>Save New Password</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <Link to="/login" className="text-xs font-bold text-navy hover:text-primary mt-6">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};
