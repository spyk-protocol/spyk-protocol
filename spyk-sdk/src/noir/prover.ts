/**
 * Noir Proof Generation
 *
 * High-level prover interface for generating OFAC non-membership proofs
 * using the smt_exclusion Noir circuit via Sunspot.
 *
 * Supports two modes:
 * - CLI mode: Uses real nargo/sunspot binaries for cryptographic proofs
 * - Mock mode: Generates mock proofs for development/demos
 *
 * Based on: https://github.com/solana-foundation/noir-examples/smt_exclusion
 */

import { PublicKey } from '@solana/web3.js';
import {
  NoirProverConfig,
  NoirProof,
  NoirComplianceResult,
  NoirError,
  NoirErrorCodes,
} from './types';
import { SunspotClient, SunspotClientConfig, SUNSPOT_DEFAULTS } from './sunspot';
import { checkNoirToolchain, ToolchainStatus } from './cli-runner';

// ============================================
// Extended Prover Config
// ============================================

/**
 * Extended prover configuration with CLI options
 */
export interface NoirProverExtendedConfig extends NoirProverConfig {
  /** Enable CLI-based proof generation (default: auto-detect) */
  useCLI?: boolean;
  /** Path to circuit directory */
  circuitDir?: string;
  /** Path to nargo binary */
  nargoPath?: string;
  /** Path to sunspot binary */
  sunspotPath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

// ============================================
// Prover Class
// ============================================

/**
 * Noir Prover for generating OFAC non-membership proofs
 *
 * This prover generates ZK proofs that an address is NOT on the OFAC
 * sanctions list, without revealing any other information about the address.
 *
 * The prover supports two modes:
 * - **CLI mode**: Uses actual nargo and sunspot binaries to generate
 *   cryptographically valid Groth16 proofs. Requires nargo and sunspot
 *   to be installed.
 * - **Mock mode**: Generates structurally correct but mock proofs for
 *   development and demos. No CLI tools required.
 *
 * The prover auto-detects CLI tools and falls back to mock mode if not available.
 *
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * // Auto-detect mode (CLI if available, mock otherwise)
 * const prover = noir.createNoirProver();
 *
 * // Force CLI mode (will throw if tools not installed)
 * const cliProver = noir.createNoirProver({ useCLI: true });
 *
 * // Force mock mode
 * const mockProver = noir.createNoirProver({ useCLI: false });
 *
 * // Generate compliance proof for an address
 * const result = await prover.proveCompliance(myAddress);
 * if (result.passed) {
 *   console.log('Address is not sanctioned!');
 *   console.log('Mode:', prover.getMode());
 *   console.log('Proof:', result.noirProof);
 * }
 * ```
 */
export class NoirProver {
  private client: SunspotClient;
  private config: NoirProverExtendedConfig;
  private initialized: boolean = false;

  /**
   * Create a new NoirProver
   * @param proverConfig - Prover-specific configuration
   */
  constructor(proverConfig: NoirProverExtendedConfig = {}) {
    this.config = proverConfig;

    // Create client config with extended options
    const clientConfig: SunspotClientConfig = {
      sunspotEndpoint: proverConfig.sunspotEndpoint,
      treeServiceEndpoint: proverConfig.treeServiceEndpoint,
      enableCache: proverConfig.enableCache,
      cacheTtlMs: proverConfig.cacheTtlMs,
      useCLI: proverConfig.useCLI,
      circuitDir: proverConfig.circuitDir,
      nargoPath: proverConfig.nargoPath,
      sunspotPath: proverConfig.sunspotPath,
      verbose: proverConfig.verbose,
    };

    this.client = new SunspotClient(clientConfig);
  }

  /**
   * Initialize the prover
   * Must be called before generating proofs
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.client.initialize();
      this.initialized = true;
    }
  }

  /**
   * Generate a compliance proof for a Solana address
   *
   * @param address - Solana address to prove compliance for
   * @returns Compliance result with proof
   */
  async proveCompliance(address: PublicKey | string): Promise<NoirComplianceResult> {
    await this.initialize();

    const pubkey = typeof address === 'string' ? new PublicKey(address) : address;

    try {
      // 1. Get current OFAC tree
      const tree = await this.client.getOFACTree();

      // 2. Generate non-membership proof
      const result = await this.client.generateNonMembershipProof(
        pubkey.toBytes(),
        tree
      );

      if (!result.success || !result.proof) {
        return {
          passed: false,
          noirProof: undefined,
          confidence: 0,
          timestamp: Date.now(),
        };
      }

      return {
        passed: true,
        noirProof: result.proof,
        confidence: 1,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Check if it's because the address IS sanctioned
      if (error instanceof Error && error.message.includes('member')) {
        return {
          passed: false,
          noirProof: undefined,
          confidence: 1,
          timestamp: Date.now(),
        };
      }

      throw new NoirError(
        `Failed to generate compliance proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
        NoirErrorCodes.PROOF_GENERATION_FAILED,
        error
      );
    }
  }

  /**
   * Batch prove compliance for multiple addresses
   *
   * @param addresses - Array of addresses to prove compliance for
   * @returns Array of compliance results
   */
  async proveComplianceBatch(addresses: (PublicKey | string)[]): Promise<NoirComplianceResult[]> {
    const results: NoirComplianceResult[] = [];

    for (const address of addresses) {
      try {
        const result = await this.proveCompliance(address);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          noirProof: undefined,
          confidence: 0,
          timestamp: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Get the circuit configuration
   */
  getCircuitInfo(): { name: string; version: string; backend: string; mode: 'cli' | 'mock' } {
    return {
      name: 'smt_exclusion',
      version: SUNSPOT_DEFAULTS.NOIR_VERSION,
      backend: 'sunspot',
      mode: this.client.getMode(),
    };
  }

  /**
   * Get the current mode (cli or mock)
   */
  getMode(): 'cli' | 'mock' {
    return this.client.getMode();
  }

  /**
   * Check if using real CLI mode
   */
  isUsingCLI(): boolean {
    return this.client.isUsingCLI();
  }

  /**
   * Get toolchain status
   */
  getToolchainStatus(): ToolchainStatus | null {
    return this.client.getToolchainStatus();
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new Noir prover for generating ZK compliance proofs
 *
 * @param config - Optional prover configuration
 * @returns Configured NoirProver instance
 *
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * // Auto-detect mode
 * const prover = noir.createNoirProver();
 *
 * // Force CLI mode
 * const cliProver = noir.createNoirProver({ useCLI: true });
 *
 * // Force mock mode for demos
 * const mockProver = noir.createNoirProver({ useCLI: false });
 *
 * const result = await prover.proveCompliance(myAddress);
 * ```
 */
export function createNoirProver(config?: NoirProverExtendedConfig): NoirProver {
  return new NoirProver(config);
}

/**
 * Check if Noir toolchain is installed and ready
 *
 * Use this to determine whether CLI mode is available before
 * creating a prover.
 *
 * @param config - Optional paths to nargo/sunspot
 * @returns Toolchain status with versions
 *
 * @example
 * ```typescript
 * const status = await noir.checkToolchain();
 * console.log('nargo:', status.nargo.installed ? status.nargo.version : 'not installed');
 * console.log('sunspot:', status.sunspot.installed ? status.sunspot.version : 'not installed');
 * console.log('Ready for CLI mode:', status.ready);
 * ```
 */
export async function checkToolchain(config?: {
  nargoPath?: string;
  sunspotPath?: string;
}): Promise<ToolchainStatus> {
  return checkNoirToolchain(config);
}
