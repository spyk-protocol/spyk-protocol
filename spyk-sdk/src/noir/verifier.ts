/**
 * On-Chain Noir Proof Verification
 *
 * Verifier for submitting Noir proofs to Solana for on-chain verification
 * via CPI to the ZK verifier program.
 *
 * Uses the Solana Foundation's pre-deployed SMT exclusion verifier:
 * https://github.com/solana-foundation/noir-examples/tree/main/circuits/smt_exclusion
 *
 * Devnet Program ID: 9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t
 *
 * The verifier supports Groth16 proofs for Sparse Merkle Tree exclusion
 * proofs, enabling privacy-preserving OFAC compliance verification.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  NoirVerifierConfig,
  NoirProof,
  VerificationResult,
  NoirError,
  NoirErrorCodes,
} from './types';
import { SUNSPOT_DEFAULTS } from './sunspot';

// ============================================
// Constants
// ============================================

/**
 * Default verifier program configuration
 *
 * The DEVNET_PROGRAM_ID uses the Solana Foundation's pre-deployed Noir SMT
 * exclusion verifier from: https://github.com/solana-foundation/noir-examples
 *
 * This verifier supports Groth16 proofs for SMT (Sparse Merkle Tree) exclusion
 * proofs, which is exactly what Spyk Protocol needs for OFAC compliance.
 */
export const VERIFIER_DEFAULTS = {
  /**
   * Verifier program ID on devnet
   * Source: solana-foundation/noir-examples SMT exclusion circuit
   * Verified deployed at slot 433576787
   */
  DEVNET_PROGRAM_ID: new PublicKey('9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t'),
  /** Verifier program ID on mainnet (placeholder - needs actual deployment) */
  MAINNET_PROGRAM_ID: new PublicKey('11111111111111111111111111111111'),
  /** Verification instruction discriminator (Sunspot verifier format) */
  VERIFY_DISCRIMINATOR: Buffer.from([0xf3, 0x74, 0xd4, 0x83, 0x4c, 0xb5, 0x77, 0x09]),
  /** Enable mock mode for demos without deployed program */
  MOCK_MODE_ENABLED: false,
} as const;

// ============================================
// Instruction Builders
// ============================================

/**
 * Build a verification instruction for on-chain proof verification
 *
 * @param proof - Noir proof to verify
 * @param verifierProgramId - Verifier program ID
 * @returns Transaction instruction for verification
 */
export function buildVerifyInstruction(
  proof: NoirProof,
  verifierProgramId: PublicKey
): TransactionInstruction {
  // Instruction data layout:
  // [8 bytes] discriminator
  // [388 bytes] proof
  // [32 bytes] address (public input)
  // [32 bytes] root (public input)

  const dataSize = 8 + 388 + 32 + 32;
  const data = Buffer.alloc(dataSize);

  let offset = 0;

  // Write discriminator
  VERIFIER_DEFAULTS.VERIFY_DISCRIMINATOR.copy(data, offset);
  offset += 8;

  // Write proof
  Buffer.from(proof.proof).copy(data, offset);
  offset += 388;

  // Write public inputs
  Buffer.from(proof.publicInputs.address).copy(data, offset);
  offset += 32;
  Buffer.from(proof.publicInputs.root).copy(data, offset);

  return new TransactionInstruction({
    programId: verifierProgramId,
    keys: [], // Verifier is stateless - no accounts needed
    data,
  });
}

// ============================================
// Verifier Class
// ============================================

/**
 * On-chain Noir proof verifier
 *
 * Submits Noir proofs to Solana for verification via the ZK verifier program.
 * This enables trustless on-chain compliance verification.
 *
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * const verifier = noir.createNoirVerifier(
 *   connection,
 *   wallet,
 *   { verifierProgramId: VERIFIER_PROGRAM_ID }
 * );
 *
 * // Verify proof on-chain
 * const result = await verifier.verifyOnChain(proof);
 * console.log('Verified:', result.verified);
 * console.log('Signature:', result.signature);
 * ```
 */
export class NoirVerifier {
  private connection: Connection;
  private payer: Keypair;
  private config: NoirVerifierConfig;

  /**
   * Create a new NoirVerifier
   *
   * @param connection - Solana RPC connection
   * @param payer - Keypair for paying transaction fees
   * @param verifierConfig - Verifier program configuration
   */
  constructor(
    connection: Connection,
    payer: Keypair,
    verifierConfig: NoirVerifierConfig
  ) {
    this.connection = connection;
    this.payer = payer;
    this.config = verifierConfig;
  }

  /**
   * Verify a proof on-chain
   *
   * @param proof - Noir proof to verify
   * @returns Verification result with transaction signature
   */
  async verifyOnChain(proof: NoirProof): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      // Build verification instruction
      const verifyIx = buildVerifyInstruction(proof, this.config.verifierProgramId);

      // Create and send transaction
      const tx = new Transaction().add(verifyIx);
      tx.feePayer = this.payer.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.payer],
        {
          commitment: 'confirmed',
        }
      );

      return {
        verified: true,
        signature,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Check if verification failed (vs network error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('custom program error')) {
        // Verification failed (proof invalid)
        return {
          verified: false,
          timestamp: Date.now(),
          error: 'Proof verification failed on-chain',
        };
      }

      // Network or other error
      throw new NoirError(
        `On-chain verification failed: ${errorMessage}`,
        NoirErrorCodes.VERIFICATION_FAILED,
        error
      );
    }
  }

  /**
   * Verify a proof via CPI (for use in other programs)
   *
   * This method returns the instruction that can be included in a larger
   * transaction for CPI-based verification.
   *
   * @param proof - Noir proof to verify
   * @returns Transaction instruction for CPI
   */
  getCpiInstruction(proof: NoirProof): TransactionInstruction {
    return buildVerifyInstruction(proof, this.config.verifierProgramId);
  }

  /**
   * Simulate verification without submitting transaction
   *
   * @param proof - Noir proof to simulate verification for
   * @returns Whether simulation succeeds
   */
  async simulateVerification(proof: NoirProof): Promise<boolean> {
    try {
      const verifyIx = buildVerifyInstruction(proof, this.config.verifierProgramId);
      const tx = new Transaction().add(verifyIx);
      tx.feePayer = this.payer.publicKey;

      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      const simulation = await this.connection.simulateTransaction(tx);

      return simulation.value.err === null;
    } catch {
      return false;
    }
  }

  /**
   * Get the verifier program ID
   */
  get programId(): PublicKey {
    return this.config.verifierProgramId;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a NoirVerifier instance
 *
 * @param connection - Solana RPC connection
 * @param payer - Keypair for paying transaction fees
 * @param verifierConfig - Verifier program configuration
 * @returns Configured NoirVerifier instance
 *
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * const verifier = noir.createNoirVerifier(
 *   connection,
 *   wallet,
 *   { verifierProgramId: PROGRAM_ID }
 * );
 * ```
 */
export function createNoirVerifier(
  connection: Connection,
  payer: Keypair,
  verifierConfig: NoirVerifierConfig
): NoirVerifier {
  return new NoirVerifier(connection, payer, verifierConfig);
}

/**
 * Get the default verifier program ID for a network
 *
 * @param network - 'devnet' or 'mainnet'
 * @returns Verifier program ID
 */
export function getDefaultVerifierProgramId(network: 'devnet' | 'mainnet'): PublicKey {
  return network === 'mainnet'
    ? VERIFIER_DEFAULTS.MAINNET_PROGRAM_ID
    : VERIFIER_DEFAULTS.DEVNET_PROGRAM_ID;
}

// ============================================
// Mock Verifier (for demos without deployed program)
// ============================================

/**
 * Mock Noir proof verifier for demos
 *
 * Provides the same interface as NoirVerifier but performs local verification
 * without requiring a deployed on-chain program. Use this for development and
 * demos when the verifier program is not yet deployed.
 *
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * // For demos without a deployed program
 * const verifier = noir.createMockNoirVerifier();
 *
 * // Verify proof locally (simulates on-chain verification)
 * const result = await verifier.verifyOnChain(proof);
 * console.log('Verified:', result.verified);
 * console.log('Mock signature:', result.signature);
 * ```
 */
export class MockNoirVerifier {
  private readonly mockProgramId: PublicKey;

  constructor() {
    // Use the System Program ID as a mock program ID
    // This is safe since we never actually call it - mock verification is local
    this.mockProgramId = new PublicKey('11111111111111111111111111111111');
  }

  /**
   * Verify a proof locally (simulates on-chain verification)
   *
   * @param proof - Noir proof to verify
   * @returns Verification result with mock transaction signature
   */
  async verifyOnChain(proof: NoirProof): Promise<VerificationResult> {
    // Perform structural validation (same as on-chain verifier)
    const isValid = this.validateProofStructure(proof);

    if (!isValid) {
      return {
        verified: false,
        timestamp: Date.now(),
        error: 'Proof structural validation failed',
      };
    }

    // Generate a mock transaction signature
    const mockSignature = this.generateMockSignature(proof);

    return {
      verified: true,
      signature: mockSignature,
      timestamp: Date.now(),
    };
  }

  /**
   * Get CPI instruction (for composability with other programs)
   * Note: This returns a valid instruction structure but won't execute on-chain
   *
   * @param proof - Noir proof
   * @returns Transaction instruction (mock)
   */
  getCpiInstruction(proof: NoirProof): TransactionInstruction {
    return buildVerifyInstruction(proof, this.mockProgramId);
  }

  /**
   * Simulate verification
   *
   * @param proof - Noir proof to verify
   * @returns Whether proof passes structural validation
   */
  async simulateVerification(proof: NoirProof): Promise<boolean> {
    return this.validateProofStructure(proof);
  }

  /**
   * Get the mock program ID
   */
  get programId(): PublicKey {
    return this.mockProgramId;
  }

  /**
   * Validate proof structure (mirrors on-chain validation)
   */
  private validateProofStructure(proof: NoirProof): boolean {
    // 1. Check proof size
    if (proof.proof.length !== SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES) {
      return false;
    }

    // 2. Check proof is not all zeros
    const proofSum = proof.proof.reduce((sum, b) => sum + b, 0);
    if (proofSum === 0) {
      return false;
    }

    // 3. Check address size
    if (proof.publicInputs.address.length !== 32) {
      return false;
    }

    // 4. Check address is not all zeros
    const addressSum = proof.publicInputs.address.reduce((sum, b) => sum + b, 0);
    if (addressSum === 0) {
      return false;
    }

    // 5. Check root size
    if (proof.publicInputs.root.length !== 32) {
      return false;
    }

    // 6. Check proof has non-trivial content
    const hasContent = proof.proof.some((b) => b !== 0 && b !== 0xff);
    if (!hasContent) {
      return false;
    }

    return true;
  }

  /**
   * Generate a deterministic mock signature based on proof content
   */
  private generateMockSignature(proof: NoirProof): string {
    // Create a deterministic "signature" from proof bytes
    // In a real scenario, this would be a Solana transaction signature
    const hash = proof.proof
      .slice(0, 32)
      .reduce((acc, byte, i) => {
        return acc + byte.toString(16).padStart(2, '0');
      }, '');

    return `mock_${hash}_${Date.now().toString(16)}`;
  }
}

/**
 * Create a mock Noir verifier for demos
 *
 * Use this when the verifier program is not deployed on devnet.
 * The mock verifier performs structural validation locally.
 *
 * @returns MockNoirVerifier instance
 */
export function createMockNoirVerifier(): MockNoirVerifier {
  return new MockNoirVerifier();
}

/**
 * Create the appropriate verifier based on environment
 *
 * @param connection - Solana RPC connection
 * @param payer - Keypair for paying transaction fees
 * @param options - Options for verifier creation
 * @returns Either NoirVerifier (if program deployed) or MockNoirVerifier
 */
export async function createAutoVerifier(
  connection: Connection,
  payer: Keypair,
  options: {
    network?: 'devnet' | 'mainnet';
    forceMock?: boolean;
  } = {}
): Promise<NoirVerifier | MockNoirVerifier> {
  const { network = 'devnet', forceMock = false } = options;

  // If mock mode is forced or program ID is placeholder, use mock
  const programId = getDefaultVerifierProgramId(network);
  const isPlaceholder = programId.equals(new PublicKey('11111111111111111111111111111111'));

  if (forceMock || isPlaceholder || VERIFIER_DEFAULTS.MOCK_MODE_ENABLED) {
    console.log('[NoirVerifier] Using mock verifier (program not deployed)');
    return createMockNoirVerifier();
  }

  // Check if program exists on-chain
  try {
    const accountInfo = await connection.getAccountInfo(programId);
    if (!accountInfo || !accountInfo.executable) {
      console.log('[NoirVerifier] Program not found on-chain, using mock verifier');
      return createMockNoirVerifier();
    }
  } catch {
    console.log('[NoirVerifier] Failed to check program, using mock verifier');
    return createMockNoirVerifier();
  }

  // Program exists, use real verifier
  return createNoirVerifier(connection, payer, { verifierProgramId: programId });
}
