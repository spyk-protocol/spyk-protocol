'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSpyk, type PrivacyCashToken } from '@/hooks';
import { useBalanceRefresh } from '@/contexts';

// Only SOL and USDC are supported by Privacy Cash
const SUPPORTED_TOKENS: PrivacyCashToken[] = ['SOL', 'USDC'];

export function DepositSection() {
  const { connected } = useWallet();
  const { depositSol, depositUsdc, isLoading, error, clearError, getSolscanUrl } = useSpyk();
  const { triggerRefresh } = useBalanceRefresh();

  const [selectedToken, setSelectedToken] = useState<PrivacyCashToken>('SOL');
  const [amount, setAmount] = useState('');
  const [lastTxSignature, setLastTxSignature] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDeposit = useCallback(async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    clearError();
    setSuccessMessage(null);
    setLastTxSignature(null);

    const result = selectedToken === 'SOL'
      ? await depositSol(amountNum)
      : await depositUsdc(amountNum);

    if (result.status === 'confirmed') {
      setSuccessMessage(`Successfully shielded ${amountNum} ${selectedToken}!`);
      setLastTxSignature(result.signature);
      setAmount(''); // Clear input on success
      // Trigger balance refresh after successful deposit
      triggerRefresh();
    }
  }, [amount, selectedToken, depositSol, depositUsdc, clearError, triggerRefresh]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    // Clear messages when user starts typing
    if (error) clearError();
    if (successMessage) setSuccessMessage(null);
  };

  return (
    <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Deposit</h2>
          <p className="text-xs text-zinc-500">Privacy Cash - Shield your tokens</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-green-400">{successMessage}</p>
              {lastTxSignature && (
                <a
                  href={getSolscanUrl(lastTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-500 hover:text-green-400 underline mt-1 inline-flex items-center gap-1"
                >
                  View on Solscan
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet Not Connected Warning */}
      {!connected && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-400">Connect your wallet to deposit</p>
        </div>
      )}

      <div className="flex gap-3">
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value as PrivacyCashToken)}
          disabled={isLoading}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {SUPPORTED_TOKENS.map((token) => (
            <option key={token} value={token}>
              {token}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          placeholder="Amount"
          min="0"
          step="0.01"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <button
          onClick={handleDeposit}
          disabled={!amount || isLoading || !connected || parseFloat(amount) <= 0}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              <span>Shielding...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Shield
            </>
          )}
        </button>
      </div>
    </div>
  );
}
