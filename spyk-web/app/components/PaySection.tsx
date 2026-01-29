'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSpyk } from '@/hooks';
import { useBalanceRefresh } from '@/contexts';

type PaymentStep =
  | 'idle'
  | 'checking-balance'
  | 'requesting-api'
  | 'invoice-received'
  | 'generating-ephemeral'
  | 'paying'
  | 'verifying'
  | 'complete'
  | 'error';

interface Invoice {
  amount: string;
  token: string;
  recipient: string;
  memo: string;
  network: string;
}

interface ApiResponse {
  data?: {
    city: string;
    weather: string;
    temperature: string;
    humidity: string;
    source: string;
  };
  timestamp?: string;
}

export function PaySection() {
  const { connected } = useWallet();
  const { getShieldedBalance, isLoading } = useSpyk();
  const { triggerRefresh } = useBalanceRefresh();

  const [apiUrl, setApiUrl] = useState('/api/premium-data');
  const [step, setStep] = useState<PaymentStep>('idle');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [ephemeralAddress, setEphemeralAddress] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shieldedBalance, setShieldedBalance] = useState<string | null>(null);

  const generateEphemeralAddress = () => {
    // Generate a mock ephemeral address for demo
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePay = useCallback(async () => {
    setError(null);
    setApiResponse(null);
    setInvoice(null);
    setEphemeralAddress(null);

    try {
      // Step 1: Check shielded balance
      setStep('checking-balance');
      await new Promise(r => setTimeout(r, 500));

      const balance = await getShieldedBalance('SOL');
      setShieldedBalance(balance?.toString() || '0');

      // Step 2: Request API
      setStep('requesting-api');
      await new Promise(r => setTimeout(r, 800));

      const response = await fetch(apiUrl);

      if (response.status === 402) {
        const data = await response.json();
        setInvoice(data.x402);
        setStep('invoice-received');
        await new Promise(r => setTimeout(r, 1000));

        // Step 3: Generate ephemeral
        setStep('generating-ephemeral');
        await new Promise(r => setTimeout(r, 600));
        const ephemeral = generateEphemeralAddress();
        setEphemeralAddress(ephemeral);

        // Step 4: Pay (mock)
        setStep('paying');
        await new Promise(r => setTimeout(r, 1000));

        // Step 5: Verify payment
        setStep('verifying');
        const verifyResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentProof: `spyk_proof_${ephemeral.slice(0, 16)}` })
        });

        if (!verifyResponse.ok) {
          throw new Error('Payment verification failed');
        }

        await new Promise(r => setTimeout(r, 500));

        // Step 6: Get data
        const dataResponse = await fetch(apiUrl, {
          headers: { 'X-Payment-Proof': `spyk_proof_${ephemeral.slice(0, 16)}` }
        });

        const apiData = await dataResponse.json();
        setApiResponse(apiData);
        setStep('complete');
        triggerRefresh();

      } else if (response.ok) {
        const data = await response.json();
        setApiResponse(data);
        setStep('complete');
      } else {
        throw new Error(`API returned ${response.status}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  }, [apiUrl, getShieldedBalance, triggerRefresh]);

  const reset = () => {
    setStep('idle');
    setInvoice(null);
    setEphemeralAddress(null);
    setApiResponse(null);
    setError(null);
  };

  const getStepIcon = (s: PaymentStep) => {
    switch (s) {
      case 'checking-balance': return '💰';
      case 'requesting-api': return '🌐';
      case 'invoice-received': return '📄';
      case 'generating-ephemeral': return '🔑';
      case 'paying': return '💸';
      case 'verifying': return '✅';
      case 'complete': return '🎉';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStepText = (s: PaymentStep) => {
    switch (s) {
      case 'checking-balance': return 'Checking shielded balance...';
      case 'requesting-api': return 'Requesting API...';
      case 'invoice-received': return 'Invoice received (402 Payment Required)';
      case 'generating-ephemeral': return 'Generating ephemeral keypair...';
      case 'paying': return 'Paying from ephemeral address...';
      case 'verifying': return 'Verifying payment...';
      case 'complete': return 'Payment complete!';
      case 'error': return 'Payment failed';
      default: return 'Ready';
    }
  };

  return (
    <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            x402 Private AI Payment
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Pay for APIs privately using shielded funds
          </p>
        </div>
        <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <span className="text-xs text-amber-400 font-medium">DEMO</span>
        </div>
      </div>

      {/* Problem/Solution */}
      {step === 'idle' && (
        <div className="mb-6 space-y-3">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              <strong>Problem:</strong> Normal payments link your wallet to every API you use.
              Competitors can track your AI spend.
            </p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">
              <strong>Solution:</strong> SPYK pays from ephemeral addresses. Your wallet never appears on-chain.
            </p>
          </div>
        </div>
      )}

      {/* API URL Input */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">API Endpoint</label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg
                     text-white placeholder-zinc-500 focus:outline-none focus:ring-2
                     focus:ring-blue-500/50 focus:border-blue-500 font-mono text-sm"
          placeholder="/api/premium-data"
          disabled={step !== 'idle'}
        />
      </div>

      {/* Progress Steps */}
      {step !== 'idle' && step !== 'complete' && step !== 'error' && (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">{getStepIcon(step)}</span>
            <div>
              <p className="text-white font-medium">{getStepText(step)}</p>
              {shieldedBalance && step === 'checking-balance' && (
                <p className="text-sm text-zinc-400">Balance: {shieldedBalance} SOL</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Display */}
      {invoice && step !== 'idle' && (
        <div className="mb-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">📄 Invoice</h3>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Amount: <span className="text-white">{invoice.amount} {invoice.token}</span></p>
            <p className="text-zinc-400">Recipient: <span className="text-white font-mono">{invoice.recipient.slice(0, 12)}...</span></p>
            <p className="text-zinc-400">Memo: <span className="text-white">{invoice.memo}</span></p>
          </div>
        </div>
      )}

      {/* Ephemeral Address */}
      {ephemeralAddress && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-300 mb-2">🔑 Ephemeral Address</h3>
          <p className="text-xs font-mono text-blue-400 break-all">{ephemeralAddress}</p>
          <p className="text-xs text-zinc-500 mt-2">One-time use only. Your wallet is hidden.</p>
        </div>
      )}

      {/* Success Result */}
      {step === 'complete' && apiResponse && (
        <div className="mb-4 space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-green-300 mb-2">✅ Private Payment Complete!</h3>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Your wallet: <span className="text-green-400">(hidden)</span></p>
              <p className="text-zinc-400">Paid from: <span className="font-mono text-zinc-300">{ephemeralAddress?.slice(0, 16)}...</span></p>
              <p className="text-zinc-400">On-chain link: <span className="text-green-400 font-bold">NONE ✓</span></p>
            </div>
          </div>

          {apiResponse.data && (
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">📊 API Response</h3>
              <pre className="text-xs text-zinc-400 overflow-auto">
{JSON.stringify(apiResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={step === 'complete' || step === 'error' ? reset : handlePay}
        disabled={!connected || (isLoading && step !== 'idle')}
        className={`w-full py-3 rounded-lg font-medium transition-all
          ${!connected
            ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            : step === 'complete'
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
            : step === 'error'
            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
          }
        `}
      >
        {!connected
          ? 'Connect Wallet'
          : step === 'complete'
          ? 'Try Again'
          : step === 'error'
          ? 'Retry'
          : step !== 'idle'
          ? 'Processing...'
          : 'Pay Privately'
        }
      </button>

      {/* How it works */}
      {step === 'idle' && (
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">How it works:</h3>
          <ol className="text-xs text-zinc-500 space-y-1">
            <li>1. Your shielded funds come from ZK pool (unlinkable)</li>
            <li>2. Ephemeral keypair generated for this payment only</li>
            <li>3. Payment sent from ephemeral address</li>
            <li>4. Keypair discarded - never reused</li>
            <li>5. <strong className="text-green-400">Your wallet never appears on-chain</strong></li>
          </ol>
        </div>
      )}
    </div>
  );
}
