import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Rocket, MailCheck } from 'lucide-react';
import { authApi } from '../../services/apiService';
import { useToast } from '../../components/common/Toast';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';
  const started = useRef(false);
  const { showToast } = useToast();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    setStatus('verifying');
    authApi.verifyEmail(token)
      .then(() => setStatus('verified'))
      .catch((cause) => {
        setStatus('error');
        showToast(cause instanceof Error ? cause.message : 'Could not verify this email address.', 'error');
      });
  }, [showToast, token]);

  const resendVerification = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const response = await authApi.resendVerificationEmail(email);
      showToast(response.message, 'info');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not send a verification link.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="bg-ambient-blobs" aria-hidden="true">
        <div className="blob-pink" />
        <div className="blob-lavender" />
        <div className="blob-blue" />
      </div>

      <div className="w-full max-w-md bg-white rounded-4xl p-8 sm:p-10 shadow-comet-lg border border-purple-50 relative z-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
          <MailCheck className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h2 className="text-2xl font-black text-navy">Verify Your Email</h2>
        <p className="text-xs text-navy-muted mt-2 leading-relaxed">
          {status === 'verifying' && 'Verifying your email address...'}
          {status === 'verified' && 'Your email is verified. You can now sign in to ExpenseAI.'}
          {status === 'error' && 'This verification link is invalid or expired. Request a new link below.'}
          {status === 'idle' && 'Check your email for a verification link to activate your account.'}
          {email && <strong className="text-navy"> {email}</strong>}
        </p>

        <div className="w-full mt-6">
          {email && status !== 'verified' && (
            <button
              type="button"
              onClick={resendVerification}
              disabled={isResending}
              className="w-full mb-3 py-3 bg-purple-50 hover:bg-purple-100 text-primary text-xs font-bold rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? 'Sending...' : 'Resend verification link'}
            </button>
          )}
          <Link
            to="/login"
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
