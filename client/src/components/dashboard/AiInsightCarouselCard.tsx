import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { InsightItem } from '../../types';

interface AiInsightCarouselCardProps {
  insights: InsightItem[];
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export const AiInsightCarouselCard: React.FC<AiInsightCarouselCardProps> = ({
  insights,
  onRegenerate,
  isLoading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentInsight = insights[currentIndex] || {
    text: 'Analyze your receipts and monthly spending with smart AI suggestions.',
    source: 'RULE',
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? insights.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === insights.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white rounded-4xl p-7 shadow-comet flex flex-col items-center text-center justify-between relative">
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-xl font-bold text-navy">Credit Reports</h3>
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="text-navy-muted hover:text-primary transition-colors p-1"
            title="Regenerate Insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        )}
      </div>

      {/* Illustrated Wallet & Pastel Pink Circle matching the screenshot */}
      <div className="relative my-3 flex items-center justify-center w-full">
        {/* Prev Arrow */}
        <button
          onClick={handlePrev}
          aria-label="Previous insight"
          className="absolute left-0 w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-navy-muted hover:text-navy hover:scale-105 transition-all z-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Illustrated Wallet artwork */}
        <div className="w-32 h-32 rounded-full bg-[#292D43] flex items-center justify-center relative shadow-inner">
          <svg viewBox="0 0 100 100" className="w-20 h-20">
            {/* Green leaves background */}
            <path d="M 28 65 Q 20 40 38 48 Q 30 70 28 65 Z" fill="#4BC9A2" />
            <path d="M 72 65 Q 80 40 62 48 Q 70 70 72 65 Z" fill="#4BC9A2" />
            {/* Blue Credit card sticking out */}
            <rect x="36" y="26" width="36" height="22" rx="4" fill="#3B82F6" transform="rotate(-8 54 37)" />
            <rect x="40" y="32" width="28" height="4" rx="2" fill="#93C5FD" transform="rotate(-8 54 37)" />
            {/* Leather Wallet */}
            <rect x="32" y="40" width="44" height="34" rx="8" fill="#6B2D46" />
            <rect x="32" y="44" width="44" height="6" fill="#582439" />
            <circle cx="68" cy="56" r="3" fill="#FBBF24" />
          </svg>
        </div>

        {/* Next Arrow */}
        <button
          onClick={handleNext}
          aria-label="Next insight"
          className="absolute right-0 w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-navy-muted hover:text-navy hover:scale-105 transition-all z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Insight Text */}
      <div className="w-full px-2">
        <p className="text-xs text-navy font-medium line-clamp-3 leading-relaxed">
          "{currentInsight.text}"
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[10px] text-navy-muted/70 bg-gray-50 border border-gray-200/80 px-2.5 py-0.5 rounded-full font-semibold">
            {currentInsight.source === 'AI' ? '✨ AI Analysis' : '📊 Rule-based'}
          </span>
          <span className="text-[10px] text-navy-muted/60">
            Informational only (FR-33)
          </span>
        </div>
      </div>
    </div>
  );
};
