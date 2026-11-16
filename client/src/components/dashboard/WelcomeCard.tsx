import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeCardProps {
  name: string;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ name }) => {
  const navigate = useNavigate();

  return (
    <div className="card-hover bg-card-blue rounded-4xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-comet">
      {/* Decorative subtle background bubbles */}
      <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-white/40 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-primary/70" />
      </div>
      <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/30" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/20 pointer-events-none" />

      {/* Stylized Illustrated Avatar matching the Comet screenshot */}
      <div className="relative mb-5">
        <div className="w-28 h-28 rounded-full bg-white/60 p-2 shadow-inner flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-purple-100 overflow-hidden relative flex items-center justify-center border-2 border-white shadow-sm">
            {/* SVG illustrated friendly avatar with glasses & purple jacket */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Hair */}
              <circle cx="50" cy="38" r="28" fill="#22263A" />
              {/* Face */}
              <circle cx="50" cy="46" r="22" fill="#FBD38D" />
              {/* Neck */}
              <rect x="44" y="64" width="12" height="12" fill="#F6AD55" />
              {/* Glasses */}
              <circle cx="42" cy="45" r="7" fill="none" stroke="#9275F5" strokeWidth="2.5" />
              <circle cx="58" cy="45" r="7" fill="none" stroke="#9275F5" strokeWidth="2.5" />
              <line x1="49" y1="45" x2="51" y2="45" stroke="#9275F5" strokeWidth="2.5" />
              {/* Smile */}
              <path d="M 45 56 Q 50 61 55 56" fill="none" stroke="#7B341E" strokeWidth="2" strokeLinecap="round" />
              {/* Cardigan / Clothing */}
              <path d="M 22 95 Q 50 72 78 95 Z" fill="#9275F5" />
              <path d="M 44 80 L 50 95 L 56 80 Z" fill="#FFFFFF" />
            </svg>
          </div>
        </div>

        {/* Floating badge top right */}
        <div className="absolute -top-1 -right-1 bg-white rounded-xl p-1.5 shadow-sm border border-blue-50">
          <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>

      <span className="text-xs font-semibold text-navy/70 tracking-wide">
        Welcome back,
      </span>
      <h2 className="text-2xl font-extrabold text-navy mt-0.5 tracking-tight">
        {name}
      </h2>

      <button
        onClick={() => navigate('/analytics')}
        className="mt-6 px-8 py-3 bg-white text-navy hover:text-primary text-xs font-bold rounded-full shadow-comet hover:shadow-comet-hover transition-all duration-200 flex items-center gap-2 group"
      >
        <span>View Analysis</span>
        <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
