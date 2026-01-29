/**
 * On-Chain Noir Proof Verification
 *
 * Verifier for submitting Noir proofs to Solana for on-chain verification
 * via CPI to the ZK verifier program.
 *
 * Based on: https://github.com/solana-foundation/noir-examples/smt_exclusion
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
  ExperimentalConfig,
  assertFeatureEnabled,
  warnExperimentalUsage,
} from '../index';
import {
  NoirVerifierConfig,
  NoirProof,
  VerificationResult,
  NoirError,
  NoirErrorCodes,
} from './types';

// ============================================
// Constants
// ============================================

/**
 * Default verifier program configuration
 */
export const VERIFIER_DEFAULTS = {
  /** Verifier program ID on devnet (placeholder - needs actual deployment) */
  DEVNET_PROGRAM_ID: new PublicKey('NoirVer1111111111111111111111111111111111111'),
  /** Verifier program ID on mainnet (placeholder - needs actual deployment) */
  MAINNET_PROGRAM_ID: new PublicKey('NoirVer1111111111111111111111111111111111111'),
  /** Verification instruction discriminator */
  VERIFY_DISCRIMINATOR: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]),
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
 * import { createNoirVerifier } from '@spyk/sdk/experimental';
 *
 * const verifier = createNoirVerifier(
 *   { noirProofs: true },
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
  private experimentalConfig: ExperimentalConfig;
  private warningShown: boolean = false;

  /**
   * Create a new NoirVerifier
   *
   * @param experimentalConfig - Experimental feature configuration
   * @param connection - Solana RPC connection
   * @param payer - Keypair for paying transaction fees
   * @param verifierConfig - Verifier program configuration
   */
  constructor(
    experimentalConfig: ExperimentalConfig,
    connection: Connection,
    payer: Keypair,
    verifierConfig: NoirVerifierConfig
  ) {
    // Verify feature is enabled
    assertFeatureEnabled('noirProofs', experimentalConfig);

    this.experimentalConfig = experimentalConfig;
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
    if (!this.warningShown) {
      warnExperimentalUsage('On-chain Noir verification');
      this.warningShown = true;
    }

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
    if (!this.warningShown) {
      warnExperimentalUsage('CPI Noir verification');
      this.warningShown = true;
    }

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
 * Create a NoirVerifier instance with feature flag validation
 *
 * @param experimentalConfig - Experimental feature configuration
 * @param connection - Solana RPC connection
 * @param payer - Keypair for paying transaction fees
 * @param verifierConfig - Verifier program configuration
 * @returns Configured NoirVerifier instance
 * @throws Error if noirProofs feature is not enabled
 *
 * @example
 * ```typescript
 * const verifier = createNoirVerifier(
 *   { noirProofs: true },
 *   connection,
 *   wallet,
 *   { verifierProgramId: PROGRAM_ID }
 * );
 * ```
 */
export function createNoirVerifier(
  experimentalConfig: ExperimentalConfig,
  connection: Connection,
  payer: Keypair,
  verifierConfig: NoirVerifierConfig
): NoirVerifier {
  return new NoirVerifier(experimentalConfig, connection, payer, verifierConfig);
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
