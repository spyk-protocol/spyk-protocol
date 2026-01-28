'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useShadowWire } from '@/hooks/useShadowWire';
import { useBalanceRefresh } from '@/contexts';

// Token options for the dropdown
const SUPPORTED_TOKENS = ['SOL', 'USDC', 'BONK', 'RADR', 'ORE'] as const;
type TokenOption = typeof SUPPORTED_TOKENS[number];

export function TransferSection() {
  const { connected } = useWallet();
  const {
    isReady,
    transferState,
    transfer,
    calculateFee,
    isValidAddress,
    resetState,
    getSolscanUrl,
  } = useShadowWire();
  const { triggerRefresh } = useBalanceRefresh();

  const [selectedToken, setSelectedToken] = useState<TokenOption>('BONK');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [showFeePreview, setShowFeePreview] = useState(false);

  // Reset state when starting a new transfer
  useEffect(() => {
    if (transferState.status === 'confirmed' || transferState.status === 'error') {
      // Keep the state visible for a moment before allowing new transfer
    }
  }, [transferState.status]);

  // Calculate fee when amount changes
  const feeInfo = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return null;
    }
    return calculateFee(numAmount, selectedToken);
  }, [amount, selectedToken, calculateFee]);

  // Validate recipient address
  const isRecipientValid = useMemo(() => {
    if (!recipient) return null; // null = not yet entered
    return isValidAddress(recipient);
  }, [recipient, isValidAddress]);

  // Validate amount
  const isAmountValid = useMemo(() => {
    if (!amount) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;
    if (feeInfo && numAmount < feeInfo.minimumAmount) return false;
    return true;
  }, [amount, feeInfo]);

  // Can submit form
  const canSubmit = useMemo(() => {
    return (
      isReady &&
      isRecipientValid === true &&
      isAmountValid === true &&
      transferState.status !== 'signing' &&
      transferState.status !== 'sending'
    );
  }, [isReady, isRecipientValid, isAmountValid, transferState.status]);

  // Handle transfer
  const handleTransfer = useCallback(async () => {
    if (!canSubmit) return;

    const numAmount = parseFloat(amount);
    setShowFeePreview(false);

    const signature = await transfer({
      recipient,
      amount: numAmount,
      token: selectedToken,
      type: 'external',
    });

    if (signature) {
      // Clear form on success
      setAmount('');
      setRecipient('');
      // Trigger balance refresh after successful transfer
      triggerRefresh();
    }
  }, [canSubmit, amount, recipient, selectedToken, transfer, triggerRefresh]);

  // Handle new transfer after success/error
  const handleNewTransfer = useCallback(() => {
    resetState();
  }, [resetState]);

  // Show fee preview before confirming
  const handleShowFeePreview = useCallback(() => {
    if (canSubmit) {
      setShowFeePreview(true);
    }
  }, [canSubmit]);

  // Cancel fee preview
  const handleCancelFeePreview = useCallback(() => {
    setShowFeePreview(false);
  }, []);

  // Get status display
  const isLoading = transferState.status === 'signing' || transferState.status === 'sending';
  const isSuccess = transferState.status === 'confirmed';
  const isError = transferState.status === 'error';

  return (
    <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Transfer</h2>
          <p className="text-xs text-zinc-500">ShadowWire - Private transfers</p>
        </div>
      </div>

      {/* Success State */}
      {isSuccess && transferState.signature && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 font-medium">Transfer Successful</span>
          </div>
          <p className="text-xs text-zinc-400 mb-2 break-all font-mono">
            {transferState.signature}
          </p>
          <div className="flex gap-2">
            <a
              href={getSolscanUrl(transferState.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              View on Solscan
            </a>
            <button
              onClick={handleNewTransfer}
              className="text-xs text-zinc-400 hover:text-zinc-300 underline ml-auto"
            >
              New Transfer
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && transferState.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-400 font-medium">Transfer Failed</span>
          </div>
          <p className="text-xs text-zinc-400 mb-2">{transferState.error}</p>
          <button
            onClick={handleNewTransfer}
            className="text-xs text-zinc-400 hover:text-zinc-300 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Fee Preview Modal */}
      {showFeePreview && feeInfo && (
        <div className="bg-zinc-800/80 border border-zinc-700 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">Confirm Transfer</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount</span>
              <span className="text-white">{amount} {selectedToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Fee ({feeInfo.feePercentage}%)</span>
              <span className="text-yellow-400">-{feeInfo.fee.toFixed(6)} {selectedToken}</span>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between font-medium">
              <span className="text-zinc-300">Recipient receives</span>
              <span className="text-green-400">{feeInfo.netAmount.toFixed(6)} {selectedToken}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">To</span>
              <span className="text-zinc-400 font-mono truncate max-w-[200px]">{recipient}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCancelFeePreview}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  {transferState.status === 'signing' ? 'Signing...' : 'Sending...'}
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      {!isSuccess && !showFeePreview && (
        <>
          {/* Wallet not connected warning */}
          {!connected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-400">
                Connect your wallet to make transfers
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Token Selector */}
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value as TokenOption)}
              disabled={!connected}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed sm:w-24"
            >
              {SUPPORTED_TOKENS.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>

            {/* Amount Input */}
            <div className="relative sm:w-32">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                min="0"
                step="0.000001"
                disabled={!connected}
                className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAmountValid === false
                    ? 'border-red-500'
                    : 'border-zinc-700'
                }`}
              />
              {isAmountValid === false && (
                <p className="absolute -bottom-5 left-0 text-xs text-red-400">
                  {feeInfo ? `Min: ${feeInfo.minimumAmount} ${selectedToken}` : 'Invalid amount'}
                </p>
              )}
            </div>

            {/* Recipient Input */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-zinc-500 text-sm whitespace-nowrap">To:</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient address"
                  disabled={!connected}
                  className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecipientValid === false
                      ? 'border-red-500'
                      : 'border-zinc-700'
                  }`}
                />
                {isRecipientValid === false && (
                  <p className="absolute -bottom-5 left-0 text-xs text-red-400">
                    Invalid Solana address
                  </p>
                )}
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleShowFeePreview}
              disabled={!canSubmit || isLoading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  {transferState.status === 'signing' ? 'Signing...' : 'Sending...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>

          {/* Fee Info Preview */}
          {feeInfo && isAmountValid && (
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Estimated Fee ({feeInfo.feePercentage}%)</span>
                <span className="text-zinc-400">{feeInfo.fee.toFixed(6)} {selectedToken}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-zinc-500">Recipient Receives</span>
                <span className="text-green-400">{feeInfo.netAmount.toFixed(6)} {selectedToken}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
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
  );
}
