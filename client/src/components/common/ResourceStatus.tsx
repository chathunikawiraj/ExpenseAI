import React from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';

interface ResourceStatusProps {
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ResourceStatus: React.FC<ResourceStatusProps> = ({ isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-xs font-medium text-navy-muted">
        <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
        Loading your latest data...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <span>Could not load live data. Showing sample data instead. {error}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 self-start font-bold text-amber-900 underline sm:self-auto"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return null;
};
