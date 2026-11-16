import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Rocket, MailCheck } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'your email';

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
          Email verification is not configured in the current backend. New accounts are automatically verified for this demo.
          <strong className="text-navy"> {email}</strong>
        </p>

        <div className="w-full mt-6">
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
