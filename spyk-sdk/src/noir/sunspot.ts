/**
 * Sunspot SDK Wrapper
 *
 * Wrapper around the Reilabs Sunspot SDK for Noir proof generation on Solana.
 * Supports both real CLI-based proof generation and mock fallback mode.
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
import {
  NoirCLIRunner,
  checkNoirToolchain,
  getDefaultCircuitDir,
  ToolchainStatus,
} from './cli-runner';

// Poseidon hash for pubkey_to_index (matches Noir's bn254::hash_2)
// circomlibjs provides the same Poseidon implementation used by Noir
let poseidonInstance: ((inputs: bigint[]) => bigint) | null = null;

async function getPoseidon(): Promise<(inputs: bigint[]) => bigint> {
  if (poseidonInstance) return poseidonInstance;

  try {
    // Dynamic import to avoid bundling issues
    const circomlibjs = await import('circomlibjs');
    const poseidon = await circomlibjs.buildPoseidon();
    poseidonInstance = (inputs: bigint[]) => {
      const hash = poseidon(inputs);
      return poseidon.F.toObject(hash);
    };
    return poseidonInstance;
  } catch (error) {
    throw new NoirError(
      'Failed to initialize Poseidon hash (circomlibjs not available)',
      NoirErrorCodes.PROVER_UNAVAILABLE,
      error
    );
  }
}

// Cache for empty tree hashes (computed once)
let emptyTreeHashesCache: bigint[] | null = null;

/**
 * Compute the hash chain for an empty SMT
 * defaultHashes[0] = 0 (empty leaf)
 * defaultHashes[i] = poseidon(defaultHashes[i-1], defaultHashes[i-1])
 */
async function getEmptyTreeHashes(depth: number): Promise<bigint[]> {
  if (emptyTreeHashesCache && emptyTreeHashesCache.length >= depth + 1) {
    return emptyTreeHashesCache;
  }

  const poseidon = await getPoseidon();
  const hashes: bigint[] = new Array(depth + 1);
  hashes[0] = 0n; // Empty leaf

  for (let i = 1; i <= depth; i++) {
    const prev = hashes[i - 1];
    hashes[i] = poseidon([prev, prev]);
  }

  emptyTreeHashesCache = hashes;
  return hashes;
}

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
// Extended Config Type
// ============================================

/**
 * Extended prover configuration with CLI options
 */
export interface SunspotClientConfig extends NoirProverConfig {
  /** Enable CLI-based proof generation (default: true if tools available) */
  useCLI?: boolean;
  /** Path to circuit directory (default: auto-detected) */
  circuitDir?: string;
  /** Path to nargo binary */
  nargoPath?: string;
  /** Path to sunspot binary */
  sunspotPath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

// ============================================
// Sunspot Client
// ============================================

/**
 * Sunspot SDK client for Noir proof operations
 *
 * This client supports two modes:
 * 1. CLI mode: Uses actual nargo/sunspot binaries for real proofs
 * 2. Mock mode: Generates mock proofs for development/demos
 *
 * The client automatically detects whether CLI tools are available and
 * falls back to mock mode if not.
 *
 * @example
 * ```typescript
 * // Auto-detect mode
 * const client = new SunspotClient();
 * await client.initialize();
 *
 * // Force CLI mode (will fail if tools not installed)
 * const cliClient = new SunspotClient({ useCLI: true });
 *
 * // Force mock mode
 * const mockClient = new SunspotClient({ useCLI: false });
 * ```
 */
export class SunspotClient {
  private config: Required<Omit<SunspotClientConfig, 'useCLI' | 'circuitDir' | 'nargoPath' | 'sunspotPath' | 'verbose'>> & {
    useCLI: boolean | 'auto';
    circuitDir?: string;
    nargoPath?: string;
    sunspotPath?: string;
    verbose: boolean;
  };
  private proofCache: Map<string, { proof: NoirProof; expires: number }>;
  private initialized: boolean = false;
  private cliRunner: NoirCLIRunner | null = null;
  private toolchainStatus: ToolchainStatus | null = null;
  private usingCLI: boolean = false;

  constructor(config: SunspotClientConfig = {}) {
    this.config = {
      sunspotEndpoint: config.sunspotEndpoint || SUNSPOT_DEFAULTS.ENDPOINT,
      treeServiceEndpoint: config.treeServiceEndpoint || SUNSPOT_DEFAULTS.TREE_SERVICE,
      enableCache: config.enableCache ?? true,
      cacheTtlMs: config.cacheTtlMs || SUNSPOT_DEFAULTS.CACHE_TTL_MS,
      useCLI: config.useCLI ?? 'auto',
      circuitDir: config.circuitDir,
      nargoPath: config.nargoPath,
      sunspotPath: config.sunspotPath,
      verbose: config.verbose ?? false,
    };
    this.proofCache = new Map();
  }

  /**
   * Initialize the Sunspot client
   * Checks for CLI tools and sets up the appropriate mode
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check toolchain status
      this.toolchainStatus = await checkNoirToolchain({
        nargoPath: this.config.nargoPath,
        sunspotPath: this.config.sunspotPath,
      });

      // Determine CLI mode
      if (this.config.useCLI === 'auto') {
        this.usingCLI = this.toolchainStatus.ready;
      } else {
        this.usingCLI = this.config.useCLI;

        // If CLI is forced but tools not available, throw error
        if (this.usingCLI && !this.toolchainStatus.ready) {
          const missing = [];
          if (!this.toolchainStatus.nargo.installed) missing.push('nargo');
          if (!this.toolchainStatus.sunspot.installed) missing.push('sunspot');
          throw new NoirError(
            `CLI mode requested but tools not installed: ${missing.join(', ')}`,
            NoirErrorCodes.PROVER_UNAVAILABLE
          );
        }
      }

      // Set up CLI runner if using CLI mode
      if (this.usingCLI) {
        const circuitDir = this.config.circuitDir || getDefaultCircuitDir();
        if (!circuitDir) {
          this.log('Circuit directory not found, falling back to mock mode');
          this.usingCLI = false;
        } else {
          this.cliRunner = new NoirCLIRunner({
            circuitDir,
            nargoPath: this.config.nargoPath,
            sunspotPath: this.config.sunspotPath,
            verbose: this.config.verbose,
          });
          this.log(`CLI mode enabled with circuit: ${circuitDir}`);
        }
      }

      if (!this.usingCLI) {
        this.log('Mock mode enabled - proofs will be simulated');
      }

      this.log(`Initializing Sunspot client (mode: ${this.usingCLI ? 'CLI' : 'mock'})`);
      this.initialized = true;
    } catch (error) {
      if (error instanceof NoirError) throw error;
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

      // Compute the proper empty tree root using Poseidon hash chain
      const TREE_DEPTH = 254;
      const emptyTreeHashes = await getEmptyTreeHashes(TREE_DEPTH);
      const emptyRoot = emptyTreeHashes[TREE_DEPTH];

      // Convert bigint root to 32-byte Uint8Array
      const rootHex = emptyRoot.toString(16).padStart(64, '0');
      const rootBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        rootBytes[i] = parseInt(rootHex.slice(i * 2, i * 2 + 2), 16);
      }

      this.log(`Empty tree root: 0x${rootHex}`);

      return {
        root: rootBytes,
        depth: TREE_DEPTH,
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

      // For an empty tree, siblings at level i are the default hash for that level
      const depth = tree.depth;
      const emptyTreeHashes = await getEmptyTreeHashes(depth);

      // Convert bigint hashes to Uint8Array siblings
      const siblings: Uint8Array[] = [];
      for (let i = 0; i < depth; i++) {
        const hashHex = emptyTreeHashes[i].toString(16).padStart(64, '0');
        const siblingBytes = new Uint8Array(32);
        for (let j = 0; j < 32; j++) {
          siblingBytes[j] = parseInt(hashHex.slice(j * 2, j * 2 + 2), 16);
        }
        siblings.push(siblingBytes);
      }

      // Compute path bits from pubkey hash
      const pubkeyHash = await this.hashAddressWithPoseidon(address);
      const hashBigint = BigInt(pubkeyHash);
      const pathBits: boolean[] = [];
      for (let i = 0; i < depth; i++) {
        pathBits.push((hashBigint >> BigInt(i) & 1n) === 1n);
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
      let proof: NoirProof;

      if (this.usingCLI && this.cliRunner) {
        // Generate real proof using CLI
        proof = await this.generateRealProof(address, tree);
      } else {
        // Generate mock proof
        proof = await this.generateMockProof(address, tree);
      }

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
   * Generate real proof using CLI tools
   */
  private async generateRealProof(
    address: Uint8Array,
    tree: SparseMerkleTree
  ): Promise<NoirProof> {
    if (!this.cliRunner) {
      throw new Error('CLI runner not initialized');
    }

    this.log('Generating real proof using CLI...');

    // Get proof path from tree service
    const proofPath = await this.getNonMembershipPath(address, tree);

    // Convert to circuit inputs
    // Use Poseidon hash to match circuit's pubkey_to_index function
    const pubkeyHash = await this.hashAddressWithPoseidon(address);
    const smtRoot = this.bytesToHex(tree.root);

    this.log(`Pubkey hash (Poseidon): ${pubkeyHash}`);
    this.log(`SMT root: ${smtRoot}`);

    // Convert siblings to hex strings
    const siblingHexes = proofPath.siblings.slice(0, 254).map((s) => this.bytesToHex(s));
    this.log(`First 3 siblings: ${siblingHexes.slice(0, 3).join(', ')}`);

    const inputs = {
      smt_root: smtRoot,
      pubkey_hash: pubkeyHash,
      pubkey: Array.from(address),
      siblings: siblingHexes,
      leaf_value: '0',
    };

    // Execute circuit to generate witness
    await this.cliRunner.execute(inputs);

    // Generate proof
    await this.cliRunner.prove();

    // Read proof files
    const proofResult = this.cliRunner.readProofFiles();

    // Verify locally
    const isValid = await this.cliRunner.verifyLocal();
    if (!isValid) {
      throw new NoirError(
        'Local proof verification failed',
        NoirErrorCodes.VERIFICATION_FAILED
      );
    }

    this.log(`Real proof generated: ${proofResult.proof.length} bytes`);

    return {
      proof: new Uint8Array(proofResult.proof),
      publicInputs: {
        address: address,
        root: tree.root,
      },
      metadata: {
        circuit: SUNSPOT_DEFAULTS.SMT_EXCLUSION_CIRCUIT,
        noirVersion: SUNSPOT_DEFAULTS.NOIR_VERSION,
        timestamp: Date.now(),
        size: proofResult.proof.length,
      },
    };
  }

  /**
   * Generate mock proof for development/demos
   */
  private async generateMockProof(
    address: Uint8Array,
    tree: SparseMerkleTree
  ): Promise<NoirProof> {
    this.log('Generating mock proof...');

    // Get proof path (for consistency)
    await this.getNonMembershipPath(address, tree);

    // Generate mock proof bytes
    const mockProofBytes = new Uint8Array(SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES);
    crypto.getRandomValues(mockProofBytes);

    return {
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
  }

  /**
   * Verify a proof locally (off-chain)
   * @param proof - Proof to verify
   * @returns Whether the proof is valid
   */
  async verifyProofLocal(proof: NoirProof): Promise<boolean> {
    await this.ensureInitialized();

    // Basic structural validation
    if (proof.proof.length !== SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES) {
      return false;
    }
    if (proof.publicInputs.address.length !== 32) {
      return false;
    }
    if (proof.publicInputs.root.length !== 32) {
      return false;
    }

    // If using CLI, perform real verification
    if (this.usingCLI && this.cliRunner) {
      try {
        return await this.cliRunner.verifyLocal();
      } catch {
        return false;
      }
    }

    // Mock verification - passes for valid-looking proofs
    return true;
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

  /**
   * Get toolchain status
   */
  getToolchainStatus(): ToolchainStatus | null {
    return this.toolchainStatus;
  }

  /**
   * Check if using real CLI mode
   */
  isUsingCLI(): boolean {
    return this.usingCLI;
  }

  /**
   * Get mode description
   */
  getMode(): 'cli' | 'mock' {
    return this.usingCLI ? 'cli' : 'mock';
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

  private bytesToHex(bytes: Uint8Array): string {
    return '0x' + Buffer.from(bytes).toString('hex');
  }

  /**
   * Hash a 32-byte address to a field element using Poseidon
   * Matches Noir circuit's pubkey_to_index function exactly:
   *   let low = bytes16_to_field(pubkey, 0);   // First 16 bytes (little-endian)
   *   let high = bytes16_to_field(pubkey, 16); // Last 16 bytes (little-endian)
   *   poseidon_hash_2(low, high)
   */
  private async hashAddressWithPoseidon(address: Uint8Array): Promise<string> {
    const poseidon = await getPoseidon();

    // bytes16_to_field: Convert 16 bytes to Field (little-endian)
    // This matches the Noir circuit's bytes16_to_field function
    const bytes16ToField = (bytes: Uint8Array, start: number): bigint => {
      let result = 0n;
      let multiplier = 1n;
      for (let i = 0; i < 16; i++) {
        result = result + BigInt(bytes[start + i]) * multiplier;
        multiplier = multiplier * 256n;
      }
      return result;
    };

    // Split 32-byte pubkey into two halves (matching circuit)
    const low = bytes16ToField(address, 0); // First 16 bytes
    const high = bytes16ToField(address, 16); // Last 16 bytes

    // Compute Poseidon hash (matches poseidon_hash_2 in circuit)
    const hash = poseidon([low, high]);

    return '0x' + hash.toString(16).padStart(64, '0');
  }

  // Synchronous fallback (less accurate, for backwards compatibility)
  private hashAddress(address: Uint8Array): string {
    // This is a simple fallback - prefer hashAddressWithPoseidon for real proofs
    // BN254 field modulus
    const BN254_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

    let hash = 0n;
    for (let i = 0; i < address.length; i++) {
      hash = (hash << 8n) | BigInt(address[i]);
    }
    hash = hash % BN254_MODULUS;

    return '0x' + hash.toString(16).padStart(64, '0');
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Sunspot] ${message}`);
    }
  }
}
