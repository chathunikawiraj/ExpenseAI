import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-primary-light flex items-center justify-center text-primary mb-4 shadow-sm">
        <Icon className="w-8 h-8 stroke-[1.8]" />
      </div>
      <h3 className="text-base font-bold text-navy">{title}</h3>
      <p className="text-xs text-navy-muted max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-full shadow-comet-glow transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-gray-200/70 rounded-2xl ${className}`} />;
};
