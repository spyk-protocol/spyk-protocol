'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

// ============================================
// Types
// ============================================

export interface TokenBalance {
  symbol: string;
  /** Human-readable amount (e.g., "1.234") */
  amount: string;
  /** Raw amount in smallest units */
  rawAmount: bigint;
  /** Decimals for this token */
  decimals: number;
}

export interface BalancesState {
  /** Public (on-chain) balances */
  public: {
    SOL: TokenBalance;
    USDC: TokenBalance;
  };
  /** Private (shielded) balances from Privacy Cash */
  shielded: {
    SOL: TokenBalance;
    USDC: TokenBalance;
  };
  /** ShadowWire balances (if available) */
  shadowWire: {
    [token: string]: TokenBalance;
  };
}

export interface UseBalancesReturn {
  /** All balances */
  balances: BalancesState;
  /** Whether balances are being fetched */
  isLoading: boolean;
  /** Last error that occurred */
  error: string | null;
  /** Last refresh timestamp */
  lastUpdated: Date | null;
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Refresh all balances */
  refresh: () => Promise<void>;
  /** Format a balance for display */
  formatBalance: (amount: string, symbol: string) => string;
}

// ============================================
// Constants
// ============================================

const USDC_DECIMALS = 6;
const SOL_DECIMALS = 9;

// USDC Mint addresses (devnet by default)
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Default empty balance
const emptyBalance = (symbol: string, decimals: number): TokenBalance => ({
  symbol,
  amount: '0',
  rawAmount: BigInt(0),
  decimals,
});

// Default balances state
const defaultBalances: BalancesState = {
  public: {
    SOL: emptyBalance('SOL', SOL_DECIMALS),
    USDC: emptyBalance('USDC', USDC_DECIMALS),
  },
  shielded: {
    SOL: emptyBalance('SOL', SOL_DECIMALS),
    USDC: emptyBalance('USDC', USDC_DECIMALS),
  },
  shadowWire: {},
};

// ============================================
// Helper Functions
// ============================================

/**
 * Format raw amount to human-readable string
 */
function formatAmount(rawAmount: bigint, decimals: number): string {
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = rawAmount / divisor;
  const fractionalPart = rawAmount % divisor;

  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

  // Remove trailing zeros but keep at least one decimal place for non-zero fractions
  const trimmedFractional = fractionalStr.replace(/0+$/, '') || '0';

  if (trimmedFractional === '0') {
    return wholePart.toString();
  }

  return `${wholePart}.${trimmedFractional}`;
}

/**
 * Create a TokenBalance from raw amount
 */
function createBalance(symbol: string, rawAmount: bigint, decimals: number): TokenBalance {
  return {
    symbol,
    amount: formatAmount(rawAmount, decimals),
    rawAmount,
    decimals,
  };
}

// ============================================
// Hook Implementation
// ============================================

/**
 * useBalances Hook
 *
 * Fetches and manages balances for public (on-chain), shielded (Privacy Cash),
 * and ShadowWire accounts.
 *
 * @example
 * ```tsx
 * const { balances, isLoading, refresh } = useBalances();
 *
 * // Access public SOL balance
 * console.log(balances.public.SOL.amount);
 *
 * // Access shielded USDC balance
 * console.log(balances.shielded.USDC.amount);
 *
 * // Refresh after a transaction
 * await refresh();
 * ```
 */
export function useBalances(): UseBalancesReturn {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const [balances, setBalances] = useState<BalancesState>(defaultBalances);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Fetch public SOL balance
   */
  const fetchPublicSolBalance = useCallback(async (): Promise<TokenBalance> => {
    if (!publicKey) {
      return emptyBalance('SOL', SOL_DECIMALS);
    }

    try {
      const lamports = await connection.getBalance(publicKey);
      return createBalance('SOL', BigInt(lamports), SOL_DECIMALS);
    } catch (err) {
      console.error('Failed to fetch SOL balance:', err);
      return emptyBalance('SOL', SOL_DECIMALS);
    }
  }, [publicKey, connection]);

  /**
   * Fetch public USDC balance
   */
  const fetchPublicUsdcBalance = useCallback(async (): Promise<TokenBalance> => {
    if (!publicKey) {
      return emptyBalance('USDC', USDC_DECIMALS);
    }

    try {
      // Get associated token account address
      const ataAddress = getAssociatedTokenAddressSync(USDC_MINT, publicKey);

      // Try to get the account info
      const accountInfo = await connection.getAccountInfo(ataAddress);

      if (!accountInfo) {
        // No USDC account exists
        return emptyBalance('USDC', USDC_DECIMALS);
      }

      // Parse token account data (amount is at bytes 64-72)
      const data = accountInfo.data;
      const amount = data.readBigUInt64LE(64);

      return createBalance('USDC', amount, USDC_DECIMALS);
    } catch (err) {
      console.error('Failed to fetch USDC balance:', err);
      return emptyBalance('USDC', USDC_DECIMALS);
    }
  }, [publicKey, connection]);

  /**
   * Fetch shielded balances from Privacy Cash
   *
   * Note: The Privacy Cash SDK requires a Keypair for authentication.
   * In browser context with wallet adapters, we need to use the wallet's
   * signing capabilities. This is currently simulated.
   *
   * TODO: Implement actual Privacy Cash balance query when SDK supports wallet adapters
   */
  const fetchShieldedBalances = useCallback(async (): Promise<{
    SOL: TokenBalance;
    USDC: TokenBalance;
  }> => {
    if (!publicKey) {
      return {
        SOL: emptyBalance('SOL', SOL_DECIMALS),
        USDC: emptyBalance('USDC', USDC_DECIMALS),
      };
    }

    try {
      // TODO: Replace with actual Privacy Cash SDK call when browser support is added
      // The SDK currently requires a Keypair, but browser wallets use adapters
      //
      // Example of how it would work with SDK support:
      // const privacyCash = new PrivacyCash({
      //   RPC_url: heliusEndpoint,
      //   owner: walletAdapter, // Would need adapter support
      // });
      // const solBalance = await privacyCash.getPrivateBalance();
      // const usdcBalance = await privacyCash.getPrivateBalanceUSDC();

      // For now, return demo balances to show the UI working
      // In production, these would come from the Privacy Cash protocol
      const demoSolLamports = BigInt(500_000_000); // 0.5 SOL demo balance
      const demoUsdcUnits = BigInt(25_000_000); // 25 USDC demo balance

      console.log('[DEMO] Privacy Cash balances are simulated. Real integration pending SDK wallet adapter support.');

      return {
        SOL: createBalance('SOL', demoSolLamports, SOL_DECIMALS),
        USDC: createBalance('USDC', demoUsdcUnits, USDC_DECIMALS),
      };
    } catch (err) {
      console.error('Failed to fetch shielded balances:', err);
      return {
        SOL: emptyBalance('SOL', SOL_DECIMALS),
        USDC: emptyBalance('USDC', USDC_DECIMALS),
      };
    }
  }, [publicKey]);

  /**
   * Fetch ShadowWire balances
   *
   * Note: ShadowWire balance queries also require authentication.
   * Currently simulated for demonstration purposes.
   */
  const fetchShadowWireBalances = useCallback(async (): Promise<{
    [token: string]: TokenBalance;
  }> => {
    if (!publicKey) {
      return {};
    }

    try {
      // TODO: Replace with actual ShadowWire SDK balance query
      // const client = new ShadowWireClient({ debug: false });
      // const balance = await client.getBalance(publicKey.toBase58(), 'BONK');

      // For now, return empty since ShadowWire is transfer-focused
      // and balance queries are less common
      return {};
    } catch (err) {
      console.error('Failed to fetch ShadowWire balances:', err);
      return {};
    }
  }, [publicKey]);

  /**
   * Refresh all balances
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!connected || !publicKey) {
      setBalances(defaultBalances);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all balances in parallel
      const [
        publicSol,
        publicUsdc,
        shielded,
        shadowWire,
      ] = await Promise.all([
        fetchPublicSolBalance(),
        fetchPublicUsdcBalance(),
        fetchShieldedBalances(),
        fetchShadowWireBalances(),
      ]);

      setBalances({
        public: {
          SOL: publicSol,
          USDC: publicUsdc,
        },
        shielded,
        shadowWire,
      });

      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(errorMessage);
      console.error('Balance refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, fetchPublicSolBalance, fetchPublicUsdcBalance, fetchShieldedBalances, fetchShadowWireBalances]);

  /**
   * Format a balance string for display
   */
  const formatBalance = useCallback((amount: string, symbol: string): string => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';

    // Format with appropriate decimal places
    if (symbol === 'SOL') {
      if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
      if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
      return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    }

    if (symbol === 'USDC') {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // For other tokens, use default formatting
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, []);

  // Auto-fetch balances when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      refresh();
    } else {
      setBalances(defaultBalances);
      setLastUpdated(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]); // Intentionally omit refresh to avoid infinite loops

  return {
    balances,
    isLoading,
    error,
    lastUpdated,
    isConnected: connected,
    refresh,
    formatBalance,
  };
}

export default useBalances;
