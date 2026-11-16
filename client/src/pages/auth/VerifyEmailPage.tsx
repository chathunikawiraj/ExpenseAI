import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import { Rocket, MailCheck, ArrowRight, RefreshCw } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  const [isVerifying, setIsVerifying] = useState(false);

  const handleSimulateVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      showToast('Email verified successfully! You may now sign in (FR-02).', 'success');
      navigate('/login');
    }, 1200);
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
          We have dispatched a single-use verification link to <strong className="text-navy">{email}</strong> valid for 24 hours (FR-02).
        </p>

        <div className="w-full mt-6 flex flex-col gap-3">
          <button
            onClick={handleSimulateVerify}
            disabled={isVerifying}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Link...</span>
              </>
            ) : (
              <>
                <span>Simulate Clicking Email Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <Link
            to="/login"
            className="text-xs font-semibold text-navy-muted hover:text-navy pt-2"
          >
            Already verified? Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
