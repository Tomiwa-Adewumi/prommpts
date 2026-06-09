'use client';

import { Zap, Loader2, Plus } from 'lucide-react';
import { useCredits } from '@/contexts/CreditContext';

interface CreditDisplayProps {
  className?: string;
  onBuyClick?: () => void;
}

export function CreditDisplay({ className = '', onBuyClick }: CreditDisplayProps) {
  const { credits, isLoading, error } = useCredits();

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error || !credits || !credits.balance) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Zap className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">--</span>
      </div>
    );
  }

  // Safely extract the credit amount with fallbacks
  const totalCredits = credits.balance?.total_available ?? 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#F1E500]" fill="#F1E500" />
        <span className="text-sm font-medium text-white">
          {totalCredits.toLocaleString()}
        </span>
      </div>

      {onBuyClick && (
        <button
          onClick={onBuyClick}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#F1E500]/10 hover:bg-[#F1E500]/20 text-[#F1E500] text-xs font-medium rounded-full transition-colors border border-[#F1E500]/20"
        >
          <Plus className="w-3 h-3" />
          Buy More
        </button>
      )}

      {credits.subscription && (
        <span className="hidden sm:inline-flex text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded-full ml-1">
          {credits.subscription.plan_name}
        </span>
      )}
    </div>
  );
}