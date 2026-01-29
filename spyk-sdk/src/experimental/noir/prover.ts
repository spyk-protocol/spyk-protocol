/**
 * Noir Proof Generation
 *
 * High-level prover interface for generating OFAC non-membership proofs
 * using the smt_exclusion Noir circuit via Sunspot.
 *
 * Based on: https://github.com/solana-foundation/noir-examples/smt_exclusion
 */

import { PublicKey } from '@solana/web3.js';
import {
  ExperimentalConfig,
  assertFeatureEnabled,
  warnExperimentalUsage,
} from '../index';
import {
  NoirProverConfig,
  NoirProof,
  ProofGenerationResult,
  NoirComplianceResult,
  NoirError,
  NoirErrorCodes,
} from './types';
import { SunspotClient, SUNSPOT_DEFAULTS } from './sunspot';

// ============================================
// Prover Class
// ============================================

/**
 * Noir Prover for generating OFAC non-membership proofs
 *
 * This prover generates ZK proofs that an address is NOT on the OFAC
 * sanctions list, without revealing any other information about the address.
 *
 * @example
 * ```typescript
 * import { Spyk } from '@spyk/sdk';
 * import { createNoirProver } from '@spyk/sdk/experimental';
 *
 * const spyk = new Spyk({
 *   // ... config
 *   experimental: { noirProofs: true }
 * });
 *
 * const prover = createNoirProver({ noirProofs: true });
 *
 * // Generate compliance proof for an address
 * const result = await prover.proveCompliance(myAddress);
 * if (result.passed) {
 *   console.log('Address is not sanctioned!');
 *   console.log('Proof:', result.noirProof);
 * }
 * ```
 */
export class NoirProver {
  private client: SunspotClient;
  private config: NoirProverConfig;
  private experimentalConfig: ExperimentalConfig;
  private warningShown: boolean = false;

  /**
   * Create a new NoirProver
   * @param experimentalConfig - Experimental feature configuration
   * @param proverConfig - Prover-specific configuration
   */
  constructor(
    experimentalConfig: ExperimentalConfig,
    proverConfig: NoirProverConfig = {}
  ) {
    // Verify feature is enabled
    assertFeatureEnabled('noirProofs', experimentalConfig);

    this.experimentalConfig = experimentalConfig;
    this.config = proverConfig;
    this.client = new SunspotClient(proverConfig);
  }

  /**
   * Initialize the prover
   * Must be called before generating proofs
   */
  async initialize(): Promise<void> {
    if (!this.warningShown) {
      warnExperimentalUsage('Noir/Sunspot ZK proofs');
      this.warningShown = true;
    }

    await this.client.initialize();
  }

  /**
   * Generate a compliance proof for a Solana address
   *
   * @param address - Solana address to prove compliance for
   * @returns Compliance result with proof
   */
  async proveCompliance(address: PublicKey | string): Promise<NoirComplianceResult> {
    await this.initialize();

    const startTime = Date.now();
    const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
    const addressBytes = pubkey.toBytes();

    try {
      // Get current OFAC tree
      const tree = await this.client.getOFACTree();

      // Generate non-membership proof
      const proofResult = await this.client.generateNonMembershipProof(
        addressBytes,
        tree
      );

      if (!proofResult.success || !proofResult.proof) {
        return {
          passed: false,
          confidence: 0,
          timestamp: Date.now(),
        };
      }

      // Verify proof locally before returning
      const localVerified = await this.client.verifyProofLocal(proofResult.proof);

      if (!localVerified) {
        throw new NoirError(
          'Generated proof failed local verification',
          NoirErrorCodes.INVALID_PROOF
        );
      }

      return {
        passed: true,
        noirProof: proofResult.proof,
        confidence: 0.95, // High confidence for ZK proof
        timestamp: Date.now(),
      };
    } catch (error) {
      if (error instanceof NoirError) {
        throw error;
      }

      throw new NoirError(
        `Compliance proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        NoirErrorCodes.PROOF_GENERATION_FAILED,
        error
      );
    }
  }

  /**
   * Generate a batch of compliance proofs
   *
   * @param addresses - Array of addresses to prove compliance for
   * @returns Array of compliance results
   */
  async proveComplianceBatch(
    addresses: (PublicKey | string)[]
  ): Promise<NoirComplianceResult[]> {
    await this.initialize();

    // Process in parallel with concurrency limit
    const CONCURRENCY = 5;
    const results: NoirComplianceResult[] = [];

    for (let i = 0; i < addresses.length; i += CONCURRENCY) {
      const batch = addresses.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(addr => this.proveCompliance(addr).catch(error => ({
          passed: false,
          confidence: 0,
          timestamp: Date.now(),
        } as NoirComplianceResult)))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check if an address can have a compliance proof generated
   * (i.e., it's not on the sanctions list)
   *
   * @param address - Address to check
   * @returns True if address can have proof generated
   */
  async canGenerateProof(address: PublicKey | string): Promise<boolean> {
    try {
      const result = await this.proveCompliance(address);
      return result.passed;
    } catch {
      return false;
    }
  }

  /**
   * Get proof generation statistics
   */
  getStats(): {
    cacheSize: number;
    circuit: string;
    noirVersion: string;
    proofSize: number;
  } {
    const cacheStats = this.client.getCacheStats();
    return {
      cacheSize: cacheStats.size,
      circuit: SUNSPOT_DEFAULTS.SMT_EXCLUSION_CIRCUIT,
      noirVersion: SUNSPOT_DEFAULTS.NOIR_VERSION,
      proofSize: SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES,
    };
  }

  /**
   * Clear the proof cache
   */
  clearCache(): void {
    this.client.clearCache();
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a NoirProver instance with feature flag validation
 *
 * @param experimentalConfig - Experimental feature configuration
 * @param proverConfig - Optional prover configuration
 * @returns Configured NoirProver instance
 * @throws Error if noirProofs feature is not enabled
 *
 * @example
 * ```typescript
 * const prover = createNoirProver({ noirProofs: true });
 * const result = await prover.proveCompliance(address);
 * ```
 */
export function createNoirProver(
  experimentalConfig: ExperimentalConfig,
  proverConfig?: NoirProverConfig
): NoirProver {
  return new NoirProver(experimentalConfig, proverConfig);
}
