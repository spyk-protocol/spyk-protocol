'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';

// ============================================
// Types
// ============================================

interface BalanceRefreshContextType {
  /** Trigger a balance refresh */
  triggerRefresh: () => void;
  /** Subscribe to refresh events */
  subscribeToRefresh: (callback: () => void) => () => void;
  /** Number of pending refresh requests */
  refreshCount: number;
}

// ============================================
// Context
// ============================================

const BalanceRefreshContext = createContext<BalanceRefreshContextType | null>(null);

// ============================================
// Provider
// ============================================

interface BalanceRefreshProviderProps {
  children: ReactNode;
}

export function BalanceRefreshProvider({ children }: BalanceRefreshProviderProps) {
  const [refreshCount, setRefreshCount] = useState(0);
  const [subscribers] = useState<Set<() => void>>(() => new Set());

  // Trigger a refresh for all subscribers
  const triggerRefresh = useCallback(() => {
    setRefreshCount((c) => c + 1);
    subscribers.forEach((callback) => {
      try {
        callback();
      } catch (err) {
        console.error('Balance refresh callback error:', err);
      }
    });
  }, [subscribers]);

  // Subscribe to refresh events
  const subscribeToRefresh = useCallback(
    (callback: () => void): (() => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    [subscribers]
  );

  const value: BalanceRefreshContextType = {
    triggerRefresh,
    subscribeToRefresh,
    refreshCount,
  };

  return (
    <BalanceRefreshContext.Provider value={value}>
      {children}
    </BalanceRefreshContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * useBalanceRefresh Hook
 *
 * Provides a way to trigger balance refreshes across components.
 * Use this in transaction handlers to refresh balances after
 * successful deposits, withdrawals, or transfers.
 *
 * @example
 * ```tsx
 * const { triggerRefresh } = useBalanceRefresh();
 *
 * const handleDeposit = async () => {
 *   const result = await deposit(amount);
 *   if (result.status === 'confirmed') {
 *     triggerRefresh(); // Refresh all balance displays
 *   }
 * };
 * ```
 */
export function useBalanceRefresh(): BalanceRefreshContextType {
  const context = useContext(BalanceRefreshContext);

  if (!context) {
    throw new Error(
      'useBalanceRefresh must be used within a BalanceRefreshProvider'
    );
  }

  return context;
}

export default BalanceRefreshProvider;
