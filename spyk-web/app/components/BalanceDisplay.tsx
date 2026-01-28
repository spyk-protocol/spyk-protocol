'use client';

import { useCallback, useEffect } from 'react';
import { useBalances } from '@/hooks';
import { useBalanceRefresh } from '@/contexts';

// Loading Spinner Component
function LoadingSpinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Refresh Icon
function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

// Shield Icon for shielded balances
function ShieldIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

// Wallet Icon for public balances
function WalletIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

// Balance Card Component
interface BalanceCardProps {
  symbol: string;
  amount: string;
  label?: string;
  isShielded?: boolean;
  isLoading?: boolean;
}

function BalanceCard({ symbol, amount, label, isShielded, isLoading }: BalanceCardProps) {
  // Get token color
  const getTokenColor = (token: string): string => {
    switch (token.toUpperCase()) {
      case 'SOL':
        return 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30';
      case 'USDC':
        return 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      default:
        return 'bg-zinc-800/50 border-zinc-700/50';
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border ${getTokenColor(symbol)} transition-all duration-200 hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-400">{symbol}</span>
          {isShielded && (
            <ShieldIcon className="w-3 h-3 text-green-400" />
          )}
        </div>
        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
          <span className="text-xs font-bold text-zinc-300">
            {symbol.charAt(0)}
          </span>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-500 text-sm">Loading...</span>
        </div>
      ) : (
        <p className="text-xl font-bold text-white font-mono truncate" title={amount}>
          {amount}
        </p>
      )}
      {label && (
        <p className="text-xs text-zinc-500 mt-1">{label}</p>
      )}
    </div>
  );
}

// Props interface (optional, for external data)
interface BalanceDisplayProps {
  /** Callback when refresh completes (for parent component integration) */
  onRefresh?: () => void;
}

export function BalanceDisplay({ onRefresh }: BalanceDisplayProps) {
  const {
    balances,
    isLoading,
    error,
    lastUpdated,
    isConnected,
    refresh,
    formatBalance,
  } = useBalances();
  const { subscribeToRefresh } = useBalanceRefresh();

  // Subscribe to refresh events from other components (Deposit, Withdraw, Transfer)
  useEffect(() => {
    const unsubscribe = subscribeToRefresh(() => {
      // Small delay to allow blockchain state to update
      setTimeout(() => {
        refresh();
      }, 1000);
    });
    return unsubscribe;
  }, [subscribeToRefresh, refresh]);

  // Handle refresh with optional callback
  const handleRefresh = useCallback(async () => {
    await refresh();
    onRefresh?.();
  }, [refresh, onRefresh]);

  // Format last updated time
  const formatLastUpdated = useCallback((date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString();
  }, []);

  return (
    <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <WalletIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Balances</h2>
            <p className="text-xs text-zinc-500">
              {lastUpdated ? `Updated ${formatLastUpdated(lastUpdated)}` : 'Connect wallet to view'}
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading || !isConnected}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 group"
          title="Refresh balances"
        >
          {isLoading ? (
            <LoadingSpinner className="w-4 h-4 text-zinc-400" />
          ) : (
            <RefreshIcon className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Not Connected State */}
      {!isConnected && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
            <WalletIcon className="w-6 h-6 text-zinc-500" />
          </div>
          <p className="text-zinc-400 text-sm">Connect your wallet to view balances</p>
        </div>
      )}

      {/* Connected - Show Balances */}
      {isConnected && (
        <>
          {/* Shielded Balances Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldIcon className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-medium text-zinc-300">Private Balances</h3>
              <span className="text-xs text-zinc-600">(Privacy Cash)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BalanceCard
                symbol="SOL"
                amount={formatBalance(balances.shielded.SOL.amount, 'SOL')}
                isShielded
                isLoading={isLoading}
              />
              <BalanceCard
                symbol="USDC"
                amount={formatBalance(balances.shielded.USDC.amount, 'USDC')}
                isShielded
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Public Balances Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <WalletIcon className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-zinc-300">Public Balances</h3>
              <span className="text-xs text-zinc-600">(On-chain)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BalanceCard
                symbol="SOL"
                amount={formatBalance(balances.public.SOL.amount, 'SOL')}
                isLoading={isLoading}
              />
              <BalanceCard
                symbol="USDC"
                amount={formatBalance(balances.public.USDC.amount, 'USDC')}
                isLoading={isLoading}
              />
            </div>
          </div>
        </>
      )}

      {/* Info Footer */}
      <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Private balances are shielded using Privacy Cash. Only you can see them.
          </span>
        </div>
      </div>
    </div>
  );
}
