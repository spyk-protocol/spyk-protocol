/**
 * Arcium Integration Types
 * Type definitions for encrypted DeFi operations
 */

import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// ============================================
// Network Configuration
// ============================================

/** Arcium cluster configuration */
export interface ArciumClusterConfig {
  /** Cluster offset for account derivation */
  clusterOffset: number;
  /** MXE program ID (defaults to Arcium's deployed program) */
  mxeProgramId?: PublicKey;
}

/** Arcium environment configuration */
export interface ArciumEnvConfig {
  /** Anchor provider for Solana connection */
  provider: anchor.AnchorProvider;
  /** Program ID of the MXE application */
  programId: PublicKey;
  /** Optional cluster configuration override */
  cluster?: ArciumClusterConfig;
}

// ============================================
// Encryption Types
// ============================================

/** Encrypted value with metadata */
export interface EncryptedValue {
  /** Ciphertext bytes */
  ciphertext: Uint8Array;
  /** Public key used for encryption */
  publicKey: Uint8Array;
  /** Nonce used for encryption */
  nonce: bigint;
}

/** Encryption keypair for MXE communication */
export interface EncryptionKeypair {
  /** X25519 private key */
  privateKey: Uint8Array;
  /** X25519 public key */
  publicKey: Uint8Array;
}

/** Shared encryption context for MXE operations */
export interface EncryptionContext {
  /** Derived shared secret with MXE */
  sharedSecret: Uint8Array;
  /** User's encryption keypair */
  keypair: EncryptionKeypair;
  /** MXE's public key */
  mxePublicKey: Uint8Array;
}

// ============================================
// Computation Types
// ============================================

/** Status of an Arcium computation */
export type ComputationStatus =
  | 'pending'
  | 'queued'
  | 'executing'
  | 'finalized'
  | 'failed';

/** Result of a computation operation */
export interface ComputationResult<T = unknown> {
  /** Computation offset identifier */
  computationOffset: anchor.BN;
  /** Transaction signature for queueing */
  queueSignature: string;
  /** Transaction signature for finalization */
  finalizeSignature?: string;
  /** Current status */
  status: ComputationStatus;
  /** Decoded output (if computation completed) */
  output?: T;
  /** Error message (if failed) */
  error?: string;
}

/** Configuration for computation tracking */
export interface ComputationTrackingConfig {
  /** Commitment level for confirmation */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Callback on status change */
  onStatusChange?: (status: ComputationStatus) => void;
}

// ============================================
// DeFi Operation Types
// ============================================

/** Private swap parameters */
export interface PrivateSwapParams {
  /** Input token mint */
  inputMint: PublicKey;
  /** Output token mint */
  outputMint: PublicKey;
  /** Amount to swap (in base units) */
  amount: bigint;
  /** Minimum output amount (slippage protection) */
  minOutputAmount: bigint;
  /** Optional: recipient address (defaults to caller) */
  recipient?: PublicKey;
}

/** Private swap result */
export interface PrivateSwapResult extends ComputationResult {
  /** Input amount swapped */
  inputAmount: bigint;
  /** Output amount received */
  outputAmount: bigint;
  /** Effective price */
  price: number;
}

/** Private lending deposit parameters */
export interface PrivateLendingDepositParams {
  /** Token to deposit */
  tokenMint: PublicKey;
  /** Amount to deposit (in base units) */
  amount: bigint;
  /** Optional: enable as collateral */
  enableCollateral?: boolean;
}

/** Private lending borrow parameters */
export interface PrivateLendingBorrowParams {
  /** Token to borrow */
  tokenMint: PublicKey;
  /** Amount to borrow (in base units) */
  amount: bigint;
  /** Collateral token mint */
  collateralMint: PublicKey;
}

/** Private lending position */
export interface PrivateLendingPosition {
  /** User's encrypted deposits */
  deposits: Map<string, EncryptedValue>;
  /** User's encrypted borrows */
  borrows: Map<string, EncryptedValue>;
  /** Health factor (encrypted) */
  healthFactor?: EncryptedValue;
}

/** Lending operation result */
export interface LendingResult extends ComputationResult {
  /** Amount affected */
  amount: bigint;
  /** Token mint */
  tokenMint: PublicKey;
  /** Operation type */
  operationType: 'deposit' | 'withdraw' | 'borrow' | 'repay';
}

// ============================================
// State Types
// ============================================

/** Encrypted shared state entry */
export interface EncryptedStateEntry<T = unknown> {
  /** State identifier/key */
  key: string;
  /** Encrypted value */
  encrypted: EncryptedValue;
  /** Last update slot */
  lastUpdateSlot: number;
  /** Optional: decrypted value (if authorized) */
  decrypted?: T;
}

/** State subscription callback */
export type StateSubscriptionCallback<T = unknown> = (
  state: EncryptedStateEntry<T>
) => void;

/** State subscription handle */
export interface StateSubscription {
  /** Unsubscribe function */
  unsubscribe: () => void;
  /** Subscription ID */
  id: number;
}

// ============================================
// Integration Types
// ============================================

/** Funding source for encrypted operations */
export type FundingSource =
  | { type: 'privacy-cash'; amount: bigint }
  | { type: 'shadowwire'; amount: bigint }
  | { type: 'direct'; amount: bigint };

/** Options for Arcium operations */
export interface ArciumOperationOptions {
  /** Funding source for fees/collateral */
  fundingSource?: FundingSource;
  /** Skip preflight checks */
  skipPreflight?: boolean;
  /** Priority fee (microlamports) */
  priorityFee?: number;
  /** Computation tracking config */
  tracking?: ComputationTrackingConfig;
}

// ============================================
// Error Types
// ============================================

/** Error codes for Arcium operations */
export const ArciumErrorCodes = {
  MXE_NOT_INITIALIZED: 'MXE_NOT_INITIALIZED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  COMPUTATION_FAILED: 'COMPUTATION_FAILED',
  COMPUTATION_TIMEOUT: 'COMPUTATION_TIMEOUT',
  INVALID_PROGRAM_ID: 'INVALID_PROGRAM_ID',
  INSUFFICIENT_COLLATERAL: 'INSUFFICIENT_COLLATERAL',
  SWAP_SLIPPAGE_EXCEEDED: 'SWAP_SLIPPAGE_EXCEEDED',
} as const;

export type ArciumErrorCode = typeof ArciumErrorCodes[keyof typeof ArciumErrorCodes];

/** Base error class for Arcium operations */
export class ArciumError extends Error {
  public readonly code: ArciumErrorCode;

  constructor(message: string, code: ArciumErrorCode) {
    super(message);
    this.name = 'ArciumError';
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ArciumError);
    }
  }
}
