/**
 * Sunspot SDK Wrapper
 *
 * Wrapper around the Reilabs Sunspot SDK for Noir proof generation on Solana.
 *
 * Based on: https://github.com/reilabs/sunspot
 * Requires: Noir 1.0.0-beta.18, Go 1.24+
 *
 * WARNING: Sunspot is NOT AUDITED. Use at your own risk.
 */

import {
  NoirProverConfig,
  SparseMerkleTree,
  SMTNonMembershipProof,
  NoirProof,
  ProofGenerationResult,
  NoirError,
  NoirErrorCodes,
} from './types';

// ============================================
// Constants
// ============================================

/**
 * Default Sunspot configuration
 */
export const SUNSPOT_DEFAULTS = {
  /** Default Sunspot devnet endpoint */
  ENDPOINT: 'https://sunspot-devnet.reilabs.io',
  /** Default tree service endpoint (hypothetical) */
  TREE_SERVICE: 'https://tree-service.spyk.dev',
  /** Default cache TTL (5 minutes) */
  CACHE_TTL_MS: 5 * 60 * 1000,
  /** smt_exclusion circuit ID */
  SMT_EXCLUSION_CIRCUIT: 'smt_exclusion',
  /** Proof size for smt_exclusion circuit */
  PROOF_SIZE_BYTES: 388,
  /** Noir version requirement */
  NOIR_VERSION: '1.0.0-beta.18',
} as const;

// ============================================
// Sunspot Client
// ============================================

/**
 * Sunspot SDK client for Noir proof operations
 *
 * This is a wrapper that will integrate with the actual Sunspot SDK
 * when available. Currently provides the interface and mock implementation.
 *
 * @example
 * ```typescript
 * const client = new SunspotClient({
 *   sunspotEndpoint: 'https://sunspot-devnet.reilabs.io',
 *   treeServiceEndpoint: 'https://tree-service.spyk.dev',
 * });
 *
 * // Get current OFAC tree root
 * const tree = await client.getOFACTree();
 *
 * // Generate non-membership proof
 * const proof = await client.generateNonMembershipProof(addressBytes, tree);
 * ```
 */
export class SunspotClient {
  private config: Required<NoirProverConfig>;
  private proofCache: Map<string, { proof: NoirProof; expires: number }>;
  private initialized: boolean = false;

  constructor(config: NoirProverConfig = {}) {
    this.config = {
      sunspotEndpoint: config.sunspotEndpoint || SUNSPOT_DEFAULTS.ENDPOINT,
      treeServiceEndpoint: config.treeServiceEndpoint || SUNSPOT_DEFAULTS.TREE_SERVICE,
      enableCache: config.enableCache ?? true,
      cacheTtlMs: config.cacheTtlMs || SUNSPOT_DEFAULTS.CACHE_TTL_MS,
    };
    this.proofCache = new Map();
  }

  /**
   * Initialize the Sunspot client
   * Verifies connectivity and loads circuit artifacts
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // TODO: When Sunspot SDK is integrated:
      // 1. Initialize WASM/native bindings
      // 2. Load circuit artifacts (smt_exclusion)
      // 3. Verify prover availability

      console.log(
        `[Sunspot] Initializing with endpoint: ${this.config.sunspotEndpoint}`
      );

      // For now, mark as initialized (will fail on actual proof generation)
      this.initialized = true;
    } catch (error) {
      throw new NoirError(
        'Failed to initialize Sunspot client',
        NoirErrorCodes.PROVER_UNAVAILABLE,
        error
      );
    }
  }

  /**
   * Get the current OFAC Sparse Merkle Tree from the tree service
   * @returns Current SMT state
   */
  async getOFACTree(): Promise<SparseMerkleTree> {
    await this.ensureInitialized();

    try {
      // TODO: Fetch actual tree from tree service
      // const response = await fetch(`${this.config.treeServiceEndpoint}/ofac/tree`);
      // const data = await response.json();

      // Mock tree for development
      return {
        root: new Uint8Array(32).fill(0), // Placeholder root
        depth: 256,
        version: BigInt(1),
      };
    } catch (error) {
      throw new NoirError(
        'Failed to fetch OFAC tree from tree service',
        NoirErrorCodes.TREE_SERVICE_ERROR,
        error
      );
    }
  }

  /**
   * Get a non-membership proof path for an address
   * @param address - Address bytes to prove non-membership for
   * @param tree - Current SMT state
   * @returns Non-membership proof path
   */
  async getNonMembershipPath(
    address: Uint8Array,
    tree: SparseMerkleTree
  ): Promise<SMTNonMembershipProof> {
    await this.ensureInitialized();

    try {
      // TODO: Fetch actual proof path from tree service
      // const response = await fetch(
      //   `${this.config.treeServiceEndpoint}/ofac/proof/${Buffer.from(address).toString('hex')}`
      // );
      // const data = await response.json();

      // Mock proof path for development
      const depth = tree.depth;
      const siblings: Uint8Array[] = [];
      const pathBits: boolean[] = [];

      for (let i = 0; i < depth; i++) {
        siblings.push(new Uint8Array(32).fill(0));
        pathBits.push((address[Math.floor(i / 8)] & (1 << (i % 8))) !== 0);
      }

      return {
        key: address,
        siblings,
        pathBits,
      };
    } catch (error) {
      throw new NoirError(
        'Failed to get non-membership proof path',
        NoirErrorCodes.TREE_SERVICE_ERROR,
        error
      );
    }
  }

  /**
   * Generate a Noir proof for address non-membership in OFAC list
   * @param address - Address bytes (32 bytes, Solana pubkey)
   * @param tree - Current SMT state
   * @returns Generated Noir proof
   */
  async generateNonMembershipProof(
    address: Uint8Array,
    tree: SparseMerkleTree
  ): Promise<ProofGenerationResult> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const cacheKey = this.getCacheKey(address, tree.root);

    // Check cache
    if (this.config.enableCache) {
      const cached = this.proofCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return {
          success: true,
          proof: cached.proof,
          generationTimeMs: Date.now() - startTime,
        };
      }
    }

    try {
      // Get proof path from tree service
      const proofPath = await this.getNonMembershipPath(address, tree);

      // TODO: When Sunspot SDK is integrated:
      // 1. Prepare circuit inputs
      // 2. Call Sunspot prover
      // 3. Get compressed proof (388 bytes)

      // Mock proof generation for development
      // In production, this would call the actual Sunspot prover
      const mockProofBytes = new Uint8Array(SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES);
      crypto.getRandomValues(mockProofBytes);

      const proof: NoirProof = {
        proof: mockProofBytes,
        publicInputs: {
          address: address,
          root: tree.root,
        },
        metadata: {
          circuit: SUNSPOT_DEFAULTS.SMT_EXCLUSION_CIRCUIT,
          noirVersion: SUNSPOT_DEFAULTS.NOIR_VERSION,
          timestamp: Date.now(),
          size: SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES,
        },
      };

      // Cache the proof
      if (this.config.enableCache) {
        this.proofCache.set(cacheKey, {
          proof,
          expires: Date.now() + this.config.cacheTtlMs,
        });
      }

      return {
        success: true,
        proof,
        generationTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during proof generation',
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Verify a proof locally (off-chain)
   * @param proof - Proof to verify
   * @returns Whether the proof is valid
   */
  async verifyProofLocal(proof: NoirProof): Promise<boolean> {
    await this.ensureInitialized();

    try {
      // TODO: When Sunspot SDK is integrated:
      // 1. Load verifier circuit
      // 2. Verify proof against public inputs
      // 3. Return verification result

      // Mock verification - always passes for valid-looking proofs
      return (
        proof.proof.length === SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES &&
        proof.publicInputs.address.length === 32 &&
        proof.publicInputs.root.length === 32
      );
    } catch (error) {
      throw new NoirError(
        'Local proof verification failed',
        NoirErrorCodes.VERIFICATION_FAILED,
        error
      );
    }
  }

  /**
   * Clear the proof cache
   */
  clearCache(): void {
    this.proofCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.proofCache.size,
      hitRate: 0, // TODO: Track cache hits/misses
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getCacheKey(address: Uint8Array, root: Uint8Array): string {
    return `${Buffer.from(address).toString('hex')}:${Buffer.from(root).toString('hex')}`;
  }
}
