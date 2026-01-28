'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  ShadowWireClient,
  TOKEN_FEES,
  TOKEN_MINIMUMS,
  TOKEN_DECIMALS,
  SUPPORTED_TOKENS,
  type TokenSymbol,
  type TransferType,
} from '@radr/shadowwire';

// ============================================
// Types
// ============================================

export type TransferStatus = 'idle' | 'signing' | 'sending' | 'confirmed' | 'error';

export interface TransferState {
  status: TransferStatus;
  signature?: string;
  error?: string;
}

export interface FeeCalculation {
  fee: number;
  feePercentage: number;
  netAmount: number;
  minimumAmount: number;
}

export interface UseShadowWireReturn {
  /** Whether wallet is connected and can sign */
  isReady: boolean;
  /** Transfer state */
  transferState: TransferState;
  /** Supported tokens */
  supportedTokens: readonly string[];
  /** Execute a transfer */
  transfer: (params: {
    recipient: string;
    amount: number;
    token: string;
    type?: TransferType;
  }) => Promise<string | null>;
  /** Calculate fee for a transfer */
  calculateFee: (amount: number, token: string) => FeeCalculation;
  /** Get token decimals */
  getDecimals: (token: string) => number;
  /** Validate a Solana address */
  isValidAddress: (address: string) => boolean;
  /** Reset transfer state */
  resetState: () => void;
  /** Get Solscan URL for a transaction */
  getSolscanUrl: (signature: string) => string;
}

// ============================================
// Hook Implementation
// ============================================

export function useShadowWire(): UseShadowWireReturn {
  const { publicKey, signMessage, connected } = useWallet();

  const [transferState, setTransferState] = useState<TransferState>({
    status: 'idle',
  });

  // Initialize ShadowWire client (singleton)
  const client = useMemo(() => {
    return new ShadowWireClient({
      debug: false,
    });
  }, []);

  // Check if wallet is ready
  const isReady = useMemo(() => {
    return connected && !!publicKey && !!signMessage;
  }, [connected, publicKey, signMessage]);

  // Validate Solana address
  const isValidAddress = useCallback((address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Calculate fee for a transfer
  const calculateFee = useCallback((amount: number, token: string): FeeCalculation => {
    const upperToken = token.toUpperCase() as TokenSymbol;
    const feePercentage = TOKEN_FEES[upperToken] ?? 0.5;
    const fee = amount * (feePercentage / 100);
    const netAmount = amount - fee;
    const minimumAmount = TOKEN_MINIMUMS[upperToken] ?? 0;

    return {
      fee,
      feePercentage,
      netAmount,
      minimumAmount,
    };
  }, []);

  // Get token decimals
  const getDecimals = useCallback((token: string): number => {
    const upperToken = token.toUpperCase() as TokenSymbol;
    return TOKEN_DECIMALS[upperToken] ?? 9;
  }, []);

  // Get Solscan URL
  const getSolscanUrl = useCallback((signature: string): string => {
    // ShadowWire currently operates on mainnet
    return `https://solscan.io/tx/${signature}`;
  }, []);

  // Reset transfer state
  const resetState = useCallback(() => {
    setTransferState({ status: 'idle' });
  }, []);

  // Execute transfer
  const transfer = useCallback(async (params: {
    recipient: string;
    amount: number;
    token: string;
    type?: TransferType;
  }): Promise<string | null> => {
    const { recipient, amount, token, type = 'external' } = params;

    // Validate prerequisites
    if (!isReady || !publicKey || !signMessage) {
      setTransferState({
        status: 'error',
        error: 'Wallet not connected or does not support signing',
      });
      return null;
    }

    // Validate recipient address
    if (!isValidAddress(recipient)) {
      setTransferState({
        status: 'error',
        error: 'Invalid recipient address',
      });
      return null;
    }

    // Validate amount
    const upperToken = token.toUpperCase() as TokenSymbol;
    const minimum = TOKEN_MINIMUMS[upperToken] ?? 0;
    if (amount <= 0) {
      setTransferState({
        status: 'error',
        error: 'Amount must be greater than 0',
      });
      return null;
    }
    if (amount < minimum) {
      setTransferState({
        status: 'error',
        error: `Amount must be at least ${minimum} ${token}`,
      });
      return null;
    }

    try {
      // Start signing
      setTransferState({ status: 'signing' });

      // Create wallet adapter for ShadowWire
      const walletAdapter = {
        signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
          return await signMessage(message);
        },
      };

      // Execute transfer
      setTransferState({ status: 'sending' });

      const result = await client.transfer({
        sender: publicKey.toBase58(),
        recipient,
        amount,
        token: upperToken,
        type,
        wallet: walletAdapter,
      });

      if (result.success && result.tx_signature) {
        setTransferState({
          status: 'confirmed',
          signature: result.tx_signature,
        });
        return result.tx_signature;
      } else {
        throw new Error('Transfer failed - no transaction signature');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
      setTransferState({
        status: 'error',
        error: errorMessage,
      });
      return null;
    }
  }, [isReady, publicKey, signMessage, client, isValidAddress]);

  return {
    isReady,
    transferState,
    supportedTokens: SUPPORTED_TOKENS,
    transfer,
    calculateFee,
    getDecimals,
    isValidAddress,
    resetState,
    getSolscanUrl,
  };
}

export default useShadowWire;
