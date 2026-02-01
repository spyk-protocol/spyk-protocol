'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface ComplianceResult {
  proof: string | null;
  isCompliant: boolean;
  mode: 'cli' | 'mock';
  verificationTx: string | null;
  explorerUrl: string | null;
  message?: string;
  metadata?: {
    circuit: string;
    noirVersion: string;
    proofSize: number;
    timestamp: string;
    verificationError: string | null;
  };
}

type ComplianceStep = 'idle' | 'generating' | 'verifying' | 'complete' | 'error';

export function ComplianceSection() {
  const { publicKey, connected } = useWallet();

  const [address, setAddress] = useState('');
  const [step, setStep] = useState<ComplianceStep>('idle');
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAddressToCheck = useCallback(() => {
    // Use input address if provided, otherwise use connected wallet
    if (address.trim()) return address.trim();
    if (publicKey) return publicKey.toBase58();
    return null;
  }, [address, publicKey]);

  const checkCompliance = useCallback(async () => {
    const addressToCheck = getAddressToCheck();

    if (!addressToCheck) {
      setError('Please enter an address or connect your wallet');
      return;
    }

    setError(null);
    setResult(null);
    setStep('generating');

    try {
      const res = await fetch('/api/spyk/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToCheck })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Request failed with status ${res.status}`);
      }

      setStep('verifying');
      const data: ComplianceResult = await res.json();

      setResult(data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStep('error');
    }
  }, [getAddressToCheck]);

  const reset = () => {
    setStep('idle');
    setResult(null);
    setError(null);
  };

  const getStepText = (s: ComplianceStep) => {
    switch (s) {
      case 'generating': return 'Generating ZK proof...';
      case 'verifying': return 'Verifying on-chain...';
      case 'complete': return 'Verification complete!';
      case 'error': return 'Verification failed';
      default: return 'Ready to check compliance';
    }
  };

  const addressToCheck = getAddressToCheck();
  const displayAddress = addressToCheck
    ? `${addressToCheck.slice(0, 8)}...${addressToCheck.slice(-8)}`
    : 'No address';

  return (
    <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">ZK Compliance</h2>
            <p className="text-xs text-zinc-500">Noir proof of OFAC non-membership</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
          <span className="text-xs text-purple-400 font-medium">NOIR</span>
        </div>
      </div>

      {/* Explanation */}
      {step === 'idle' && (
        <div className="mb-6 space-y-3">
          <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <p className="text-sm text-zinc-400">
              <strong className="text-zinc-300">What is this?</strong> Generate a zero-knowledge proof that an address is NOT on the OFAC sanctions list, without revealing which address.
            </p>
          </div>
        </div>
      )}

      {/* Address Input */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          Address to check {connected && !address && <span className="text-purple-400">(using connected wallet)</span>}
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg
                     text-white placeholder-zinc-500 focus:outline-none focus:ring-2
                     focus:ring-purple-500/50 focus:border-purple-500 font-mono text-sm"
          placeholder={publicKey ? publicKey.toBase58() : "Enter Solana address..."}
          disabled={step !== 'idle' && step !== 'complete' && step !== 'error'}
        />
      </div>

      {/* Progress State */}
      {(step === 'generating' || step === 'verifying') && (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-purple-400" viewBox="0 0 24 24">
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
            <div>
              <p className="text-white font-medium">{getStepText(step)}</p>
              <p className="text-sm text-zinc-400">Address: {displayAddress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Result */}
      {step === 'complete' && result && (
        <div className="mb-4 space-y-4">
          {/* Compliance Status */}
          <div className={`p-4 rounded-lg border ${
            result.isCompliant
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {result.isCompliant ? (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <p className={`font-medium ${result.isCompliant ? 'text-green-400' : 'text-red-400'}`}>
                  {result.isCompliant ? 'Address is Compliant' : 'Address is Non-Compliant'}
                </p>
                <p className="text-sm text-zinc-400">
                  {result.isCompliant
                    ? 'Not found on OFAC sanctions list'
                    : result.message || 'May be on OFAC sanctions list'}
                </p>
              </div>
            </div>
          </div>

          {/* Proof Details */}
          {result.proof && (
            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Proof Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mode:</span>
                  <span className="text-zinc-300 font-mono">{result.mode}</span>
                </div>
                {result.metadata && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Circuit:</span>
                      <span className="text-zinc-300 font-mono">{result.metadata.circuit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Proof Size:</span>
                      <span className="text-zinc-300 font-mono">{result.metadata.proofSize} bytes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Noir Version:</span>
                      <span className="text-zinc-300 font-mono">{result.metadata.noirVersion}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* On-chain Verification Link */}
          {result.explorerUrl && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <h3 className="text-sm font-medium text-purple-300 mb-2">On-chain Verification</h3>
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                View proof on Solscan
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Verification Error (non-blocking) */}
          {result.metadata?.verificationError && !result.explorerUrl && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                Note: On-chain verification skipped - {result.metadata.verificationError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={step === 'complete' || step === 'error' ? reset : checkCompliance}
        disabled={step === 'generating' || step === 'verifying' || (!addressToCheck && step === 'idle')}
        className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2
          ${step === 'generating' || step === 'verifying'
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            : step === 'complete'
            ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
            : step === 'error'
            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            : !addressToCheck
            ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
          }
        `}
      >
        {step === 'generating' || step === 'verifying' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {getStepText(step)}
          </>
        ) : step === 'complete' ? (
          'Check Another Address'
        ) : step === 'error' ? (
          'Try Again'
        ) : !addressToCheck ? (
          'Enter Address or Connect Wallet'
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Check Compliance
          </>
        )}
      </button>

      {/* How it works */}
      {step === 'idle' && (
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">How it works:</h3>
          <ol className="text-xs text-zinc-500 space-y-1">
            <li>1. Address is checked against OFAC Sparse Merkle Tree</li>
            <li>2. Noir circuit generates exclusion proof (ZK)</li>
            <li>3. Proof verified on Solana devnet verifier program</li>
            <li>4. <strong className="text-purple-400">Proof is cryptographically sound</strong></li>
          </ol>
        </div>
      )}
    </div>
  );
}
