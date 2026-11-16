import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { Rocket, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Generic response does not reveal whether email is registered (FR-05)
    showToast('If an account exists, a single-use 30-minute password reset link was sent.', 'info');
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
        <h2 className="text-2xl font-black text-navy text-center">Reset Password</h2>
        <p className="text-xs text-navy-muted text-center mt-1">
          Enter your email address to receive a 30-minute recovery link (FR-05).
        </p>

        {isSubmitted ? (
          <div className="w-full my-6 p-4 rounded-3xl bg-purple-50 border border-purple-100 text-center">
            <p className="text-xs font-semibold text-navy">
              Check your inbox for the password reset instructions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 mt-6">
            <div>
              <label className="block text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-navy-muted" />
                Account Email
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

            <button
              type="submit"
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2"
            >
              <span>Send Recovery Link</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="text-xs font-bold text-navy hover:text-primary flex items-center gap-1.5 mt-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
};
