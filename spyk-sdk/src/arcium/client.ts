/**
 * ArciumClient - Core client wrapper for Arcium MXE interactions
 *
 * Provides encryption, computation tracking, and account derivation
 * utilities for confidential DeFi operations.
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { randomBytes, createHash } from 'crypto';
import nacl from 'tweetnacl';
import {
  getArciumEnv,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getClusterAccAddress,
  getComputationAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  awaitComputationFinalization,
  RescueCipher,
  deserializeLE,
  x25519,
} from '@arcium-hq/client';
import {
  ArciumEnvConfig,
  EncryptionContext,
  EncryptionKeypair,
  EncryptedValue,
  ComputationResult,
  ComputationStatus,
  ComputationTrackingConfig,
  ArciumError,
  ArciumErrorCodes,
} from './types';

// ============================================
// Constants
// ============================================

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_MXE_RETRY_ATTEMPTS = 20;
const MXE_RETRY_DELAY_MS = 500;
const ENCRYPTION_KEY_MESSAGE = 'spyk-arcium-encryption-key-v1';

// ============================================
// ArciumClient Class
// ============================================

/**
 * Core client for Arcium MXE interactions
 *
 * Handles:
 * - Encryption/decryption with MXE
 * - Account address derivation
 * - Computation submission and tracking
 *
 * @example
 * ```typescript
 * const client = new ArciumClient({
 *   provider: anchorProvider,
 *   programId: myMxeProgramId,
 * });
 *
 * // Initialize encryption context
 * await client.initializeEncryption();
 *
 * // Encrypt values for MXE
 * const encrypted = client.encrypt([BigInt(100)]);
 *
 * // Submit computation and track
 * const result = await client.trackComputation(offset, programId);
 * ```
 */
export class ArciumClient {
  private provider: anchor.AnchorProvider;
  private programId: PublicKey;
  private arciumEnv: ReturnType<typeof getArciumEnv>;
  private encryptionContext?: EncryptionContext;
  private cipher?: RescueCipher;

  constructor(config: ArciumEnvConfig) {
    this.provider = config.provider;
    this.programId = config.programId;
    this.arciumEnv = getArciumEnv();
  }

  // ============================================
  // Getters
  // ============================================

  /** Get the Anchor provider */
  get anchorProvider(): anchor.AnchorProvider {
    return this.provider;
  }

  /** Get the MXE program ID */
  get mxeProgramId(): PublicKey {
    return this.programId;
  }

  /** Get the cluster offset */
  get clusterOffset(): number {
    return this.arciumEnv.arciumClusterOffset;
  }

  /** Check if encryption is initialized */
  get isEncryptionInitialized(): boolean {
    return this.encryptionContext !== undefined && this.cipher !== undefined;
  }

  // ============================================
  // Account Addresses
  // ============================================

  /** Get the cluster account address */
  getClusterAccount(): PublicKey {
    return getClusterAccAddress(this.clusterOffset);
  }

  /** Get the MXE account address for this program */
  getMXEAccount(): PublicKey {
    return getMXEAccAddress(this.programId);
  }

  /** Get the mempool account address */
  getMempoolAccount(): PublicKey {
    return getMempoolAccAddress(this.clusterOffset);
  }

  /** Get the executing pool account address */
  getExecutingPoolAccount(): PublicKey {
    return getExecutingPoolAccAddress(this.clusterOffset);
  }

  /** Get computation account address for a given offset */
  getComputationAccount(offset: anchor.BN): PublicKey {
    return getComputationAccAddress(this.clusterOffset, offset);
  }

  /** Get computation definition account address */
  getCompDefAccount(compDefName: string): PublicKey {
    const offset = getCompDefAccOffset(compDefName);
    return getCompDefAccAddress(
      this.programId,
      Buffer.from(offset).readUInt32LE()
    );
  }

  // ============================================
  // Encryption
  // ============================================

  /**
   * Initialize encryption context by fetching MXE public key
   * and deriving shared secret.
   *
   * @param wallet - Optional wallet for deterministic key derivation
   */
  async initializeEncryption(wallet?: Keypair): Promise<void> {
    // Fetch MXE public key with retry
    const mxePublicKey = await this.getMXEPublicKeyWithRetry();

    let keypair: EncryptionKeypair;

    if (wallet) {
      // Derive deterministic keypair from wallet signature
      keypair = this.deriveEncryptionKeyFromWallet(wallet);
    } else {
      // Generate random keypair
      const privateKey = x25519.utils.randomSecretKey();
      const publicKey = x25519.getPublicKey(privateKey);
      keypair = { privateKey, publicKey };
    }

    // Derive shared secret
    const sharedSecret = x25519.getSharedSecret(keypair.privateKey, mxePublicKey);

    this.encryptionContext = {
      sharedSecret,
      keypair,
      mxePublicKey,
    };

    this.cipher = new RescueCipher(sharedSecret);
  }

  /**
   * Derive a deterministic encryption keypair from a Solana wallet.
   * Signs a fixed message with the wallet's Ed25519 key, then hashes
   * the signature to produce a valid X25519 private key.
   */
  private deriveEncryptionKeyFromWallet(wallet: Keypair): EncryptionKeypair {
    const messageBytes = new TextEncoder().encode(ENCRYPTION_KEY_MESSAGE);
    const signature = nacl.sign.detached(messageBytes, wallet.secretKey);
    const privateKey = new Uint8Array(createHash('sha256').update(signature).digest());
    const publicKey = x25519.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }

  /**
   * Fetch MXE public key with retry logic
   */
  private async getMXEPublicKeyWithRetry(): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= MAX_MXE_RETRY_ATTEMPTS; attempt++) {
      try {
        const mxePublicKey = await getMXEPublicKey(this.provider, this.programId);
        if (mxePublicKey) {
          return mxePublicKey;
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
      }

      if (attempt < MAX_MXE_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, MXE_RETRY_DELAY_MS));
      }
    }

    throw new ArciumError(
      `Failed to fetch MXE public key after ${MAX_MXE_RETRY_ATTEMPTS} attempts`,
      ArciumErrorCodes.MXE_NOT_INITIALIZED
    );
  }

  /**
   * Encrypt values for MXE computation
   *
   * @param values - Array of bigint values to encrypt
   * @returns Encrypted value with metadata
   */
  encrypt(values: bigint[]): EncryptedValue {
    if (!this.cipher || !this.encryptionContext) {
      throw new ArciumError(
        'Encryption not initialized. Call initializeEncryption() first.',
        ArciumErrorCodes.ENCRYPTION_FAILED
      );
    }

    const nonce = randomBytes(16);
    const ciphertexts = this.cipher.encrypt(values, nonce);

    // For single value, return first ciphertext
    // For multiple values, concatenate (each is 32 bytes)
    const ciphertext = values.length === 1
      ? new Uint8Array(ciphertexts[0])
      : new Uint8Array(ciphertexts.flat());

    return {
      ciphertext,
      publicKey: this.encryptionContext.keypair.publicKey,
      nonce: deserializeLE(nonce),
    };
  }

  /**
   * Encrypt multiple separate values
   *
   * @param values - Array of bigint values
   * @returns Array of individual encrypted values
   */
  encryptMultiple(values: bigint[]): EncryptedValue[] {
    return values.map((v) => this.encrypt([v]));
  }

  /**
   * Get encryption public key
   */
  getEncryptionPublicKey(): Uint8Array {
    if (!this.encryptionContext) {
      throw new ArciumError(
        'Encryption not initialized',
        ArciumErrorCodes.ENCRYPTION_FAILED
      );
    }
    return this.encryptionContext.keypair.publicKey;
  }

  // ============================================
  // Computation Tracking
  // ============================================

  /**
   * Generate a random computation offset
   */
  generateComputationOffset(): anchor.BN {
    return new anchor.BN(randomBytes(8), 'hex');
  }

  /**
   * Wait for a computation to finalize
   *
   * @param computationOffset - The computation offset to track
   * @param config - Tracking configuration
   * @returns Computation result
   */
  async trackComputation<T = unknown>(
    computationOffset: anchor.BN,
    config?: ComputationTrackingConfig
  ): Promise<ComputationResult<T>> {
    const commitment = config?.commitment || 'confirmed';
    const timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;

    config?.onStatusChange?.('queued');

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Computation timeout')),
          timeoutMs
        );
      });

      config?.onStatusChange?.('executing');

      const finalizeSignature = await Promise.race([
        awaitComputationFinalization(
          this.provider,
          computationOffset,
          this.programId,
          commitment
        ),
        timeoutPromise,
      ]);

      config?.onStatusChange?.('finalized');

      return {
        computationOffset,
        queueSignature: '', // Filled by caller
        finalizeSignature,
        status: 'finalized',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('timeout')) {
        config?.onStatusChange?.('failed');
        throw new ArciumError(
          'Computation timed out',
          ArciumErrorCodes.COMPUTATION_TIMEOUT
        );
      }

      config?.onStatusChange?.('failed');
      throw new ArciumError(
        `Computation failed: ${message}`,
        ArciumErrorCodes.COMPUTATION_FAILED
      );
    }
  }

  /**
   * Build common accounts for MXE instructions
   */
  buildMXEAccounts(
    computationOffset: anchor.BN,
    compDefName: string
  ): {
    computationAccount: PublicKey;
    clusterAccount: PublicKey;
    mxeAccount: PublicKey;
    mempoolAccount: PublicKey;
    executingPool: PublicKey;
    compDefAccount: PublicKey;
  } {
    return {
      computationAccount: this.getComputationAccount(computationOffset),
      clusterAccount: this.getClusterAccount(),
      mxeAccount: this.getMXEAccount(),
      mempoolAccount: this.getMempoolAccount(),
      executingPool: this.getExecutingPoolAccount(),
      compDefAccount: this.getCompDefAccount(compDefName),
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an ArciumClient instance
 *
 * @param config - Environment configuration
 * @returns Configured ArciumClient
 */
export function createArciumClient(config: ArciumEnvConfig): ArciumClient {
  return new ArciumClient(config);
}
