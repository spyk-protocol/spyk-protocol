/**
 * Noir/Sunspot Integration Types
 *
 * Types for Aztec Noir ZK proofs via Sunspot SDK
 *
 * Based on research from:
 * - https://github.com/reilabs/sunspot
 * - https://github.com/solana-foundation/noir-examples (smt_exclusion)
 */

import { PublicKey } from '@solana/web3.js';

// ============================================
// Sparse Merkle Tree Types
// ============================================

/**
 * A node in the Sparse Merkle Tree
 * Used for OFAC/sanctions list membership proofs
 */
export interface SMTNode {
  /** Hash of the node (Poseidon hash) */
  hash: Uint8Array;
  /** Left child hash (or empty for leaf) */
  left?: Uint8Array;
  /** Right child hash (or empty for leaf) */
  right?: Uint8Array;
}

/**
 * Sparse Merkle Tree for non-membership proofs
 * Used to prove an address is NOT on a sanctions list
 */
export interface SparseMerkleTree {
  /** Root hash of the tree */
  root: Uint8Array;
  /** Tree depth (typically 256 for address hashing) */
  depth: number;
  /** Tree version/epoch for updates */
  version: bigint;
}

/**
 * Merkle proof for SMT non-membership
 * Proves that a key does NOT exist in the tree
 */
export interface SMTNonMembershipProof {
  /** The key being proven (address hash) */
  key: Uint8Array;
  /** Sibling hashes along the path */
  siblings: Uint8Array[];
  /** Path bits indicating left/right at each level */
  pathBits: boolean[];
  /** Neighboring leaf key (for non-membership) */
  neighboringKey?: Uint8Array;
}

// ============================================
// Noir Proof Types
// ============================================

/**
 * Noir circuit inputs for smt_exclusion proof
 */
export interface NoirProofInputs {
  /** Address to prove is not sanctioned */
  address: Uint8Array;
  /** Current SMT root hash */
  root: Uint8Array;
  /** Non-membership proof path */
  path: SMTNonMembershipProof;
}

/**
 * Generated Noir proof (388 bytes compressed)
 */
export interface NoirProof {
  /** Raw proof bytes */
  proof: Uint8Array;
  /** Public inputs for verification */
  publicInputs: {
    /** Address that was proven */
    address: Uint8Array;
    /** Root hash at time of proof */
    root: Uint8Array;
  };
  /** Proof metadata */
  metadata: {
    /** Circuit name (e.g., "smt_exclusion") */
    circuit: string;
    /** Noir version used */
    noirVersion: string;
    /** Proof generation timestamp */
    timestamp: number;
    /** Proof size in bytes */
    size: number;
  };
}

// ============================================
// Prover Types
// ============================================

/**
 * Configuration for the Noir prover
 */
export interface NoirProverConfig {
  /** Sunspot RPC endpoint */
  sunspotEndpoint?: string;
  /** Tree service endpoint for OFAC list */
  treeServiceEndpoint?: string;
  /** Cache proofs for performance */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
}

/**
 * Result of proof generation
 */
export interface ProofGenerationResult {
  /** Whether proof generation succeeded */
  success: boolean;
  /** Generated proof (if successful) */
  proof?: NoirProof;
  /** Error message (if failed) */
  error?: string;
  /** Time taken to generate proof (ms) */
  generationTimeMs: number;
}

// ============================================
// Verifier Types
// ============================================

/**
 * Configuration for on-chain verification
 */
export interface NoirVerifierConfig {
  /** Verifier program ID on Solana */
  verifierProgramId: PublicKey;
  /** Whether to use CPI to ZK verifier */
  useCpi?: boolean;
}

/**
 * Result of on-chain verification
 */
export interface VerificationResult {
  /** Whether verification passed */
  verified: boolean;
  /** Transaction signature (if on-chain) */
  signature?: string;
  /** Verification timestamp */
  timestamp: number;
  /** Error message (if failed) */
  error?: string;
}

// ============================================
// Compliance Integration Types
// ============================================

/**
 * Combined compliance check result
 * Integrates Noir proof with existing Range Protocol checks
 */
export interface NoirComplianceResult {
  /** Whether address passed compliance */
  passed: boolean;
  /** Noir non-membership proof */
  noirProof?: NoirProof;
  /** On-chain verification result */
  verification?: VerificationResult;
  /** Range Protocol result (if enabled) */
  rangeResult?: {
    sanctioned: boolean;
    provider: string;
  };
  /** Combined confidence score (0-1) */
  confidence: number;
  /** Timestamp of check */
  timestamp: number;
}

// ============================================
// Tree Service Types
// ============================================

/**
 * OFAC tree service for managing sanctions list
 */
export interface TreeServiceConfig {
  /** API endpoint for tree service */
  endpoint: string;
  /** API key (if required) */
  apiKey?: string;
  /** Update interval in milliseconds */
  updateIntervalMs?: number;
}

/**
 * Tree update event
 */
export interface TreeUpdateEvent {
  /** New root hash */
  newRoot: Uint8Array;
  /** Previous root hash */
  previousRoot: Uint8Array;
  /** Update timestamp */
  timestamp: number;
  /** Number of entries added */
  entriesAdded: number;
  /** Number of entries removed */
  entriesRemoved: number;
}

// ============================================
// Error Types
// ============================================

/**
 * Error codes for Noir integration
 */
export const NoirErrorCodes = {
  FEATURE_DISABLED: 'NOIR_FEATURE_DISABLED',
  PROVER_UNAVAILABLE: 'NOIR_PROVER_UNAVAILABLE',
  TREE_SERVICE_ERROR: 'NOIR_TREE_SERVICE_ERROR',
  PROOF_GENERATION_FAILED: 'NOIR_PROOF_GENERATION_FAILED',
  VERIFICATION_FAILED: 'NOIR_VERIFICATION_FAILED',
  INVALID_PROOF: 'NOIR_INVALID_PROOF',
  ADDRESS_SANCTIONED: 'NOIR_ADDRESS_SANCTIONED',
  NETWORK_ERROR: 'NOIR_NETWORK_ERROR',
} as const;

export type NoirErrorCode = typeof NoirErrorCodes[keyof typeof NoirErrorCodes];

/**
 * Error class for Noir integration
 */
export class NoirError extends Error {
  public readonly code: NoirErrorCode;
  public readonly details?: unknown;

  constructor(message: string, code: NoirErrorCode, details?: unknown) {
    super(message);
    this.name = 'NoirError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NoirError);
    }
  }
}
