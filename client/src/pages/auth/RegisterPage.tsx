import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { Rocket, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');

  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    return hasMinLength && hasLetter && hasNumber;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(password)) {
      showToast('Password must be at least 8 characters with a letter and number (FR-01).', 'error');
      return;
    }

    showToast('Registration successful! Verification email sent (FR-02).', 'success');
    navigate('/verify-email?email=' + encodeURIComponent(email));
  };

  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

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
        <h2 className="text-2xl font-black text-navy text-center">Create Your Account</h2>
        <p className="text-xs text-navy-muted text-center mt-1">
          Start tracking expenses with smart OCR & AI
        </p>

        <form onSubmit={handleRegister} className="w-full flex flex-col gap-3.5 mt-6">
          <div>
            <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-navy-muted" />
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jonathan Ward"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

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
              placeholder="jonathan@example.com"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-navy-muted" />
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            />

            {/* Password Requirement Checklist (FR-01) */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-navy-muted">
              <span className={`flex items-center gap-1 ${hasLength ? 'text-emerald-600 font-bold' : ''}`}>
                <CheckCircle2 className="w-3 h-3" /> 8+ chars
              </span>
              <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 font-bold' : ''}`}>
                <CheckCircle2 className="w-3 h-3" /> Letter
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-bold' : ''}`}>
                <CheckCircle2 className="w-3 h-3" /> Number
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F8F9FE] text-xs font-medium text-navy rounded-2xl border border-gray-200 focus:outline-none focus:border-primary"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-3 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2"
          >
            <span>Complete Registration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-navy-muted text-center mt-6">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};
