import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { Rocket, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/apiService';
import { ApiError } from '../../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please provide both email and password.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast('Signed in successfully. Welcome back!', 'success');
      navigate('/dashboard');
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'EMAIL_NOT_VERIFIED') {
        showToast('Verify your email address, or request a new verification link below.', 'error');
      } else {
        showToast(cause instanceof Error ? cause.message : 'Could not sign in.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      showToast('Enter your email address above first.', 'error');
      return;
    }

    setIsResending(true);
    try {
      const response = await authApi.resendVerificationEmail(email.trim());
      showToast(response.message || 'If the account is unverified, a verification link has been sent.', 'info');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not send a verification link.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background ambient blobs */}
      <div className="bg-ambient-blobs" aria-hidden="true">
        <div className="blob-pink" />
        <div className="blob-lavender" />
        <div className="blob-blue" />
      </div>

      <div className="w-full max-w-md bg-white rounded-4xl p-8 sm:p-10 shadow-comet-lg border border-purple-50 relative z-10 flex flex-col items-center">
        {/* Brand */}
        <div className="w-14 h-14 rounded-3xl bg-primary-light text-primary flex items-center justify-center mb-4 shadow-sm">
          <Rocket className="w-7 h-7 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-black text-navy text-center">Welcome Back</h2>
        <p className="text-xs text-navy-muted text-center mt-1">
          Sign in to your ExpenseAI personal dashboard
        </p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4 mt-2">
          <div>
            <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-navy-muted" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-navy flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-navy-muted" />
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isSubmitting ? 'Signing In...' : 'Sign In to ExpenseAI'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="w-full mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-center">
          <p className="text-xs text-navy-muted">
            Didn't receive your verification email? Enter your email above and request a new link.
          </p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={isResending}
            className="mt-3 text-xs font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResending ? 'Sending verification link...' : 'Resend verification link'}
          </button>
        </div>

        <p className="text-xs text-navy-muted text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};
