/**
 * Spyk Protocol SDK Types
 * Shared type definitions for Privacy Cash and ShadowWire
 */

import { Keypair, PublicKey } from '@solana/web3.js';

// ============================================
// Network & Configuration
// ============================================

/** Supported Solana networks */
export type Network = 'devnet' | 'mainnet';

/** Supported RPC providers */
export type RpcProvider = 'helius' | 'quicknode' | 'custom';

/** SDK Configuration */
export interface SpykConfig {
  /** RPC provider type (auto-detected from env if not specified) */
  rpcProvider?: RpcProvider;
  /** Helius API key for RPC access */
  heliusApiKey?: string;
  /** Quicknode RPC URL */
  quicknodeUrl?: string;
  /** Custom RPC URL */
  customRpcUrl?: string;
  /** Target network (for Helius provider) */
  network: Network;
  /** Wallet keypair for signing transactions */
  wallet: Keypair;
}

// ============================================
// Token Types
// ============================================

/** Tokens supported by Privacy Cash (SOL and USDC only) */
export type PrivacyCashToken = 'SOL' | 'USDC';

/** Tokens supported by ShadowWire (extended token support) */
export type ShadowWireToken = 'SOL' | 'USDC' | 'BONK' | 'RADR' | 'ORE' | string;

/** Union of all supported tokens */
export type SupportedToken = PrivacyCashToken | ShadowWireToken;

// ============================================
// Transfer Types
// ============================================

/** Type of transfer destination */
export type TransferType = 'internal' | 'external';

/** Callbacks for transaction lifecycle */
export interface TransactionCallbacks {
  /** Called when transaction is being signed */
  onSigning?: () => void;
  /** Called when transaction is sent to network */
  onSent?: (signature: string) => void;
  /** Called when transaction is confirmed */
  onConfirmed?: (signature: string) => void;
  /** Called when transaction fails */
  onError?: (error: Error) => void;
}

// ============================================
// Result Types
// ============================================

/** Transaction status */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/** Protocol used for the operation */
export type Protocol = 'privacy-cash' | 'shadowwire';

/** Result of a transfer operation */
export interface TransferResult {
  /** Transaction signature */
  signature: string;
  /** Current status */
  status: TransactionStatus;
  /** Protocol used */
  protocol: Protocol;
  /** Error message if failed */
  error?: string;
}

/** Result of a balance query */
export interface BalanceResult {
  /** Token queried */
  token: SupportedToken;
  /** Balance amount (in lamports for SOL, base units for others) */
  amount: bigint;
  /** Protocol used for query */
  protocol: Protocol;
}

/** Shield operation result */
export interface ShieldResult extends TransferResult {
  /** Amount shielded */
  amount: bigint;
  /** Token shielded */
  token: PrivacyCashToken;
}

/** Unshield operation result */
export interface UnshieldResult extends TransferResult {
  /** Amount unshielded */
  amount: bigint;
  /** Token unshielded */
  token: PrivacyCashToken;
  /** Destination address */
  destination: PublicKey;
  /** Fee charged (in lamports/base units) */
  fee?: bigint;
  /** Whether this was a partial withdrawal */
  isPartial?: boolean;
}

// ============================================
// Error Codes
// ============================================

/** Error codes for SDK operations */
export const ErrorCodes = {
  HELIUS_CONNECTION_FAILED: 'HELIUS_CONNECTION_FAILED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_PRIVATE_BALANCE: 'INSUFFICIENT_PRIVATE_BALANCE',
  UNSUPPORTED_TOKEN: 'UNSUPPORTED_TOKEN',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================
// Error Classes
// ============================================

/** Base error class for Spyk SDK */
export class SpykError extends Error {
  public readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.name = 'SpykError';
    this.code = code;
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SpykError);
    }
  }
}

/** Error for Helius RPC connection issues */
export class HeliusConnectionError extends SpykError {
  constructor(message: string) {
    super(message, ErrorCodes.HELIUS_CONNECTION_FAILED);
    this.name = 'HeliusConnectionError';
  }
}

/** Error for transaction failures */
export class TransactionError extends SpykError {
  public readonly signature?: string;

  constructor(message: string, signature?: string) {
    super(message, ErrorCodes.TRANSACTION_FAILED);
    this.name = 'TransactionError';
    this.signature = signature;
  }
}

/** Error for insufficient balance */
export class InsufficientBalanceError extends SpykError {
  public readonly required: bigint;
  public readonly available: bigint;
  public readonly token: SupportedToken;

  constructor(required: bigint, available: bigint, token: SupportedToken, isPrivateBalance = false) {
    const code = isPrivateBalance
      ? ErrorCodes.INSUFFICIENT_PRIVATE_BALANCE
      : ErrorCodes.INSUFFICIENT_BALANCE;
    super(
      `Insufficient ${isPrivateBalance ? 'private ' : ''}balance: required ${required}, available ${available} ${token}`,
      code
    );
    this.name = 'InsufficientBalanceError';
    this.required = required;
    this.available = available;
    this.token = token;
  }
}

/** Error for unsupported tokens */
export class UnsupportedTokenError extends SpykError {
  public readonly token: string;
  public readonly protocol: Protocol;

  constructor(token: string, protocol: Protocol) {
    super(
      `Token "${token}" is not supported by ${protocol}`,
      ErrorCodes.UNSUPPORTED_TOKEN
    );
    this.name = 'UnsupportedTokenError';
    this.token = token;
    this.protocol = protocol;
  }
}

/** Error for invalid addresses */
export class InvalidAddressError extends SpykError {
  public readonly address: string;

  constructor(address: string) {
    super(`Invalid Solana address: ${address}`, ErrorCodes.INVALID_ADDRESS);
    this.name = 'InvalidAddressError';
    this.address = address;
  }
}

/** Error for invalid amounts */
export class InvalidAmountError extends SpykError {
  public readonly amount: bigint | number | string;

  constructor(amount: bigint | number | string) {
    super(`Invalid amount: ${amount}. Amount must be positive.`, ErrorCodes.INVALID_AMOUNT);
    this.name = 'InvalidAmountError';
    this.amount = amount;
  }
}
