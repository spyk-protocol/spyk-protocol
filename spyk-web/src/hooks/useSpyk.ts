'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Token types supported by Privacy Cash
export type PrivacyCashToken = 'SOL' | 'USDC';

// Balance state
export interface BalanceState {
  shielded: number;
  public: number;
  total: number;
}

// Result types
export interface TransactionResult {
  signature: string;
  status: 'confirmed' | 'failed';
  amount?: number;
  token?: PrivacyCashToken;
  explorerUrl?: string;
  error?: string;
}

// x402 Payment result
export interface PaymentResult {
  paid: boolean;
  verified?: boolean;
  signature?: string;
  explorerUrl?: string;
  amount?: string;
  apiResponse?: unknown;
  message?: string;
  error?: string;
}

export interface UseSpykReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  balance: BalanceState;

  // Deposit functions
  depositSol: (amount: number) => Promise<TransactionResult>;
  depositUsdc: (amount: number) => Promise<TransactionResult>;

  // Withdraw functions
  withdrawSol: (amount: number, recipient?: string) => Promise<TransactionResult>;
  withdrawUsdc: (amount: number, recipient?: string) => Promise<TransactionResult>;

  // x402 Payment
  pay: (url: string, maxAmount?: number) => Promise<PaymentResult>;

  // Balance functions
  fetchBalance: () => Promise<BalanceState>;
  getShieldedBalance: (token: PrivacyCashToken) => Promise<number>;

  // Utility
  clearError: () => void;
  getSolscanUrl: (signature: string) => string;
}

/**
 * useSpyk Hook
 *
 * Provides deposit, withdraw, and x402 payment functionality for Spyk Protocol.
 * Calls server-side API routes that use the demo wallet for real devnet transactions.
 *
 * @example
 * ```tsx
 * const { depositSol, withdrawSol, pay, balance, isLoading, error } = useSpyk();
 *
 * const handleDeposit = async () => {
 *   const result = await depositSol(0.1);
 *   if (result.status === 'confirmed') {
 *     console.log('Deposited!', result.signature);
 *     console.log('View on Solscan:', result.explorerUrl);
 *   }
 * };
 *
 * const handlePayment = async () => {
 *   const result = await pay('https://api.example.com/premium-endpoint', 0.01);
 *   if (result.paid) {
 *     console.log('Paid privately!', result.apiResponse);
 *   }
 * };
 * ```
 */
export function useSpyk(): UseSpykReturn {
  const { connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceState>({
    shielded: 0,
    public: 0,
    total: 0,
  });

  // Use ref to track if initial fetch has been done
  const initialFetchDone = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get Solscan URL for a transaction
   */
  const getSolscanUrl = useCallback((signature: string): string => {
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  }, []);

  /**
   * Fetch balance from API
   */
  const fetchBalance = useCallback(async (): Promise<BalanceState> => {
    try {
      const res = await fetch('/api/spyk/balance');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || 'Failed to fetch balance');
      }
      const data = await res.json();
      const newBalance: BalanceState = {
        shielded: data.shielded ?? 0,
        public: data.public ?? 0,
        total: data.total ?? 0,
      };
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      console.error('[useSpyk] Balance fetch error:', err);
      // Return default balance on error
      return { shielded: 0, public: 0, total: 0 };
    }
  }, []);

  /**
   * Get shielded balance for a specific token (SOL or USDC)
   * Note: Currently only returns SOL shielded balance from the balance API
   */
  const getShieldedBalance = useCallback(async (token: PrivacyCashToken): Promise<number> => {
    const bal = await fetchBalance();
    // Currently the balance API only returns SOL shielded balance
    // USDC balance would need additional API support
    if (token === 'SOL') {
      return bal.shielded;
    }
    // For USDC, return 0 for now (would need separate API endpoint)
    return 0;
  }, [fetchBalance]);

  /**
   * Fetch balance on mount and periodically
   */
  useEffect(() => {
    // Only fetch on mount if not already done
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchBalance();
    }
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  /**
   * Deposit SOL into Privacy Cash (shielded pool)
   */
  const depositSol = useCallback(async (amount: number): Promise<TransactionResult> => {
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return { signature: '', status: 'failed', error: 'Invalid amount' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/spyk/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, token: 'SOL' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deposit failed');
      }

      // Refresh balance after deposit
      await fetchBalance();

      return {
        signature: data.signature,
        status: 'confirmed',
        amount,
        token: 'SOL',
        explorerUrl: data.explorerUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMessage);
      return { signature: '', status: 'failed', error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  /**
   * Deposit USDC into Privacy Cash (shielded pool)
   */
  const depositUsdc = useCallback(async (amount: number): Promise<TransactionResult> => {
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return { signature: '', status: 'failed', error: 'Invalid amount' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/spyk/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, token: 'USDC' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deposit failed');
      }

      // Refresh balance after deposit
      await fetchBalance();

      return {
        signature: data.signature,
        status: 'confirmed',
        amount,
        token: 'USDC',
        explorerUrl: data.explorerUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMessage);
      return { signature: '', status: 'failed', error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  /**
   * Withdraw SOL from Privacy Cash (shielded pool)
   */
  const withdrawSol = useCallback(async (amount: number, recipient?: string): Promise<TransactionResult> => {
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return { signature: '', status: 'failed', error: 'Invalid amount' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/spyk/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, token: 'SOL', recipient }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Withdraw failed');
      }

      // Refresh balance after withdrawal
      await fetchBalance();

      return {
        signature: data.signature,
        status: 'confirmed',
        amount,
        token: 'SOL',
        explorerUrl: data.explorerUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdraw failed';
      setError(errorMessage);
      return { signature: '', status: 'failed', error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  /**
   * Withdraw USDC from Privacy Cash (shielded pool)
   */
  const withdrawUsdc = useCallback(async (amount: number, recipient?: string): Promise<TransactionResult> => {
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return { signature: '', status: 'failed', error: 'Invalid amount' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/spyk/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, token: 'USDC', recipient }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Withdraw failed');
      }

      // Refresh balance after withdrawal
      await fetchBalance();

      return {
        signature: data.signature,
        status: 'confirmed',
        amount,
        token: 'USDC',
        explorerUrl: data.explorerUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdraw failed';
      setError(errorMessage);
      return { signature: '', status: 'failed', error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  /**
   * Make a private x402 payment to a URL
   *
   * Flow:
   * 1. Fetches the URL to check for 402 Payment Required
   * 2. Parses x402 payment details
   * 3. Validates amount against maxAmount
   * 4. Makes private payment from shielded balance
   * 5. Retries original URL with payment proof
   * 6. Returns the API response
   */
  const pay = useCallback(async (url: string, maxAmount = 0.01): Promise<PaymentResult> => {
    if (!url) {
      setError('URL is required');
      return { paid: false, error: 'URL is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/spyk/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      // Refresh balance after payment
      if (data.paid) {
        await fetchBalance();
      }

      return {
        paid: data.paid,
        verified: data.verified,
        signature: data.signature,
        explorerUrl: data.explorerUrl,
        amount: data.amount,
        apiResponse: data.apiResponse,
        message: data.message,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      return { paid: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  return {
    isConnected: connected,
    isLoading,
    error,
    balance,
    depositSol,
    depositUsdc,
    withdrawSol,
    withdrawUsdc,
    pay,
    fetchBalance,
    getShieldedBalance,
    clearError,
    getSolscanUrl,
  };
}

export default useSpyk;
