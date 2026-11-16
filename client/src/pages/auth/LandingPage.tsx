import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  ShieldCheck,
  Receipt,
  PieChart,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-navy font-sans antialiased relative overflow-x-hidden">
      {/* Background ambient pastel bubbles */}
      <div className="bg-ambient-blobs" aria-hidden="true">
        <div className="blob-pink" />
        <div className="blob-lavender" />
        <div className="blob-blue" />
      </div>

      {/* Top Header Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white shadow-comet flex items-center justify-center text-primary">
            <Rocket className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-xl font-black text-navy tracking-tight">ExpenseAI</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 text-xs font-bold text-navy hover:text-primary transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full shadow-comet-glow transition-all"
          >
            Get Started Free
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 text-center relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-purple-100 shadow-sm text-xs font-bold text-primary mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Next-Generation Personal Finance Monorepo</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-navy tracking-tight leading-tight max-w-4xl">
          Smarter financial control with <span className="text-primary">Receipt OCR</span> & <span className="text-primary">AI Insights</span>
        </h1>

        <p className="text-base sm:text-lg text-navy-muted max-w-2xl mt-5 leading-relaxed">
          Track expenses, extract receipt data with Tesseract OCR, stay ahead of 50/80/100% budget thresholds, and unlock zero-PII spending analytics.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-full shadow-comet-glow transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Live Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-gray-50 text-navy text-sm font-bold rounded-full border border-gray-200 shadow-comet transition-all"
          >
            Sign In with Demo Account
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-20 text-left">
          <div className="bg-card-blue rounded-4xl p-7 shadow-comet flex flex-col justify-between">
            <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-primary mb-4">
              <Receipt className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy">Smart OCR Scanning</h3>
              <p className="text-xs text-navy/80 mt-1 leading-relaxed">
                Upload receipts in JPG or PNG format. Automatic heuristic parsing extracts vendor, total amount, and date with 85%+ accuracy.
              </p>
            </div>
          </div>

          <div className="bg-card-lavender rounded-4xl p-7 shadow-comet flex flex-col justify-between">
            <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-primary mb-4">
              <PieChart className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy">Budget Alert Thresholds</h3>
              <p className="text-xs text-navy/80 mt-1 leading-relaxed">
                Automated in-app and email alert triggers at 50%, 80%, and 100% threshold marks to ensure you never overspend your limit.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-4xl p-7 shadow-comet flex flex-col justify-between">
            <div className="w-12 h-12 rounded-3xl bg-primary-light flex items-center justify-center text-primary mb-4">
              <Lock className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy">Zero-PII Privacy AI</h3>
              <p className="text-xs text-navy-muted mt-1 leading-relaxed">
                AI insights run on strictly aggregated category numbers. No personal names, emails, or receipt images leave your server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-100 py-8 relative z-10 text-center text-xs text-navy-muted">
        <p>© 2026 ExpenseAI Platform. Styled to Comet Wallet visual reference.</p>
      </footer>
    </div>
  );
};
