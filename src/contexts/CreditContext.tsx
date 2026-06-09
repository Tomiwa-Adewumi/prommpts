'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CreditBalance {
  permanent_credits: number;
  total_available: number;
  total_lifetime_used: number;
  referral_code: string;
}

interface CreditData {
  balance: CreditBalance;
  subscription?: {
    plan_name: string;
    status: string;
  } | null;
}

interface CreditContextType {
  credits: CreditData | null;
  isLoading: boolean;
  error: string | null;
  fetchCredits: () => Promise<void>;
  optimisticallySpendCredits: (amount: number) => void;
  revertOptimisticSpend: (amount: number) => void;
  updateCreditsFromApiResponse: (newBalance: number) => void;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/credits');

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      setCredits(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      setIsLoading(false);
    }
  };

  const optimisticallySpendCredits = (amount: number) => {
    // Prevent NaN operations
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    setCredits(prev => {
      if (!prev?.balance) return prev;
      
      return {
        ...prev,
        balance: {
          ...prev.balance,
          total_available: Math.max(0, prev.balance.total_available - amount),
          total_lifetime_used: prev.balance.total_lifetime_used + amount
        }
      };
    });
  };

  const revertOptimisticSpend = (amount: number) => {
    // Prevent NaN operations
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    setCredits(prev => {
      if (!prev?.balance) return prev;
      
      return {
        ...prev,
        balance: {
          ...prev.balance,
          total_available: prev.balance.total_available + amount,
          total_lifetime_used: Math.max(0, prev.balance.total_lifetime_used - amount)
        }
      };
    });
  };

  const updateCreditsFromApiResponse = (newBalance: number) => {
    // Prevent NaN operations
    if (isNaN(newBalance) || newBalance < 0) return;
    
    setCredits(prev => {
      if (!prev?.balance) return prev;
      
      return {
        ...prev,
        balance: {
          ...prev.balance,
          total_available: newBalance
        }
      };
    });
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  return (
    <CreditContext.Provider value={{
      credits,
      isLoading,
      error,
      fetchCredits,
      optimisticallySpendCredits,
      revertOptimisticSpend,
      updateCreditsFromApiResponse
    }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}