import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { Rocket, Lock, Mail, ArrowRight, ShieldCheck, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('demo@expenseai.local');
  const [password, setPassword] = useState('Demo123!');
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please provide both email and password.', 'error');
      return;
    }

    showToast('Signed in successfully! Welcome back, Jonathan.', 'success');
    navigate('/dashboard');
  };

  const autofillCredentials = (role: 'admin' | 'demo') => {
    if (role === 'admin') {
      setEmail('admin@expenseai.local');
      setPassword('Admin123!');
    } else {
      setEmail('demo@expenseai.local');
      setPassword('Demo123!');
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

        {/* Quick Demo Autofill Pills */}
        <div className="flex items-center gap-2 my-4 p-1.5 bg-[#F8F9FE] rounded-full border border-gray-100 text-[11px]">
          <span className="text-navy-muted pl-2 font-medium">Quick Autofill:</span>
          <button
            type="button"
            onClick={() => autofillCredentials('demo')}
            className="px-3 py-1 bg-white hover:bg-gray-100 text-navy font-bold rounded-full shadow-sm"
          >
            Demo User
          </button>
          <button
            type="button"
            onClick={() => autofillCredentials('admin')}
            className="px-3 py-1 bg-primary text-white font-bold rounded-full shadow-comet-glow"
          >
            Admin
          </button>
        </div>

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

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-navy">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              <span>Remember me for 7 days</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2"
          >
            <span>Sign In to ExpenseAI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

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
