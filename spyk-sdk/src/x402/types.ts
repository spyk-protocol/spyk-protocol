import type { Connection } from '@solana/web3.js';

export interface X402Invoice {
  amount: string;
  token: 'SOL' | 'USDC';
  recipient: string;
  memo?: string;
  facilitator?: string;
  network?: 'devnet' | 'mainnet-beta';
}

export interface X402PaymentResult {
  signature: string;
  isPrivate: boolean;
  timestamp: number;
  proof?: string;
  ephemeralUsed?: string;
  withdrawalSignature?: string;
}

export interface X402PaymentRequest {
  version: string;
  amount: string;
  token: string;
  network: string;
  recipient: string;
  memo?: string;
  facilitator?: string;
}

export interface X402Facilitator {
  createPaymentProof(invoice: X402Invoice): Promise<string>;
  verifyPayment(proof: string): Promise<{ valid: boolean; details?: unknown }>;
}
