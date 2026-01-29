/**
 * EncryptedStateManager - Encrypted shared state operations
 *
 * Manages reading, writing, and subscribing to encrypted on-chain state
 * using Arcium's MXE (Multi-party eXecution Environment).
 */

import { PublicKey, Connection } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  getComputationAccInfo,
  subscribeComputations,
  unsubscribeComputations,
} from '@arcium-hq/reader';
import { ArciumClient } from './client';
import {
  EncryptedStateEntry,
  StateSubscription,
  StateSubscriptionCallback,
  ComputationResult,
  ComputationTrackingConfig,
  ArciumError,
  ArciumErrorCodes,
} from './types';

// ============================================
// Types
// ============================================

/** State update operation type */
export type StateOperation = 'set' | 'increment' | 'decrement' | 'accumulate';

/** Parameters for state write operations */
export interface StateWriteParams {
  /** State key/identifier */
  key: string;
  /** Value to write (will be encrypted) */
  value: bigint;
  /** Operation type */
  operation: StateOperation;
  /** Optional: custom computation definition name */
  compDefName?: string;
}

/** Parameters for state read operations */
export interface StateReadParams {
  /** State key/identifier */
  key: string;
  /** Whether to decrypt (requires authorization) */
  decrypt?: boolean;
}

/** Encrypted state configuration */
export interface EncryptedStateConfig {
  /** Arcium client instance */
  client: ArciumClient;
  /** State account program ID */
  stateProgram?: PublicKey;
}

// ============================================
// EncryptedStateManager Class
// ============================================

/**
 * Manager for encrypted shared state operations
 *
 * Provides utilities for:
 * - Reading encrypted state entries
 * - Writing/updating encrypted state
 * - Subscribing to state changes
 * - Accumulating encrypted values (e.g., votes, balances)
 *
 * @example
 * ```typescript
 * const stateManager = new EncryptedStateManager({
 *   client: arciumClient,
 * });
 *
 * // Write encrypted state
 * await stateManager.write({
 *   key: 'user-balance',
 *   value: BigInt(1000),
 *   operation: 'set',
 * });
 *
 * // Subscribe to state changes
 * const sub = stateManager.subscribe('user-balance', (state) => {
 *   console.log('State updated:', state);
 * });
 * ```
 */
export class EncryptedStateManager {
  private client: ArciumClient;
  private stateProgram?: PublicKey;
  private subscriptions: Map<number, StateSubscription> = new Map();
  private nextSubscriptionId = 0;

  constructor(config: EncryptedStateConfig) {
    this.client = config.client;
    this.stateProgram = config.stateProgram;
  }

  // ============================================
  // Read Operations
  // ============================================

  /**
   * Read an encrypted state entry
   *
   * @param params - Read parameters
   * @returns Encrypted state entry
   */
  async read<T = unknown>(
    params: StateReadParams
  ): Promise<EncryptedStateEntry<T> | null> {
    const { key } = params;

    try {
      // Derive state account address from key
      const stateAccount = this.deriveStateAccount(key);

      // Fetch account info
      const accountInfo = await this.client.anchorProvider.connection.getAccountInfo(
        stateAccount
      );

      if (!accountInfo) {
        return null;
      }

      // Parse encrypted state from account data
      // Note: Actual parsing depends on the state program's account structure
      const entry = this.parseStateAccount<T>(key, accountInfo.data);

      return entry;
    } catch (error) {
      console.error('Failed to read encrypted state:', error);
      return null;
    }
  }

  /**
   * Read multiple state entries
   *
   * @param keys - Array of state keys
   * @returns Map of key to state entry
   */
  async readMultiple<T = unknown>(
    keys: string[]
  ): Promise<Map<string, EncryptedStateEntry<T> | null>> {
    const results = new Map<string, EncryptedStateEntry<T> | null>();

    // Batch fetch for efficiency
    const entries = await Promise.all(
      keys.map((key) => this.read<T>({ key }))
    );

    keys.forEach((key, index) => {
      results.set(key, entries[index]);
    });

    return results;
  }

  // ============================================
  // Write Operations
  // ============================================

  /**
   * Write/update encrypted state
   *
   * @param params - Write parameters
   * @param trackingConfig - Optional computation tracking config
   * @returns Computation result
   */
  async write(
    params: StateWriteParams,
    trackingConfig?: ComputationTrackingConfig
  ): Promise<ComputationResult> {
    if (!this.client.isEncryptionInitialized) {
      throw new ArciumError(
        'Encryption not initialized',
        ArciumErrorCodes.ENCRYPTION_FAILED
      );
    }

    const { key, value, operation, compDefName } = params;

    // Encrypt the value
    const encrypted = this.client.encrypt([value]);

    // Generate computation offset
    const computationOffset = this.client.generateComputationOffset();

    // Build MXE accounts
    const mxeAccounts = this.client.buildMXEAccounts(
      computationOffset,
      compDefName || `state_${operation}`
    );

    // Note: Actual instruction submission depends on the state program
    // This is a template showing the pattern
    console.log('State write prepared:', {
      key,
      operation,
      computationOffset: computationOffset.toString(),
      encrypted: {
        ciphertextLength: encrypted.ciphertext.length,
        nonce: encrypted.nonce.toString(),
      },
    });

    // Track computation
    const result = await this.client.trackComputation(
      computationOffset,
      trackingConfig
    );

    return {
      ...result,
      queueSignature: '', // Filled by actual transaction
    };
  }

  /**
   * Accumulate a value to existing encrypted state
   * Useful for voting, balance updates, etc.
   *
   * @param key - State key
   * @param delta - Value to accumulate
   * @param trackingConfig - Optional tracking config
   */
  async accumulate(
    key: string,
    delta: bigint,
    trackingConfig?: ComputationTrackingConfig
  ): Promise<ComputationResult> {
    return this.write(
      {
        key,
        value: delta,
        operation: 'accumulate',
      },
      trackingConfig
    );
  }

  // ============================================
  // Subscriptions
  // ============================================

  /**
   * Subscribe to state changes for a key
   *
   * @param key - State key to watch
   * @param callback - Callback on state change
   * @returns Subscription handle
   */
  subscribe<T = unknown>(
    key: string,
    callback: StateSubscriptionCallback<T>
  ): StateSubscription {
    const subscriptionId = this.nextSubscriptionId++;
    const stateAccount = this.deriveStateAccount(key);

    // Subscribe to account changes
    const wsSubscriptionId = this.client.anchorProvider.connection.onAccountChange(
      stateAccount,
      (accountInfo) => {
        const entry = this.parseStateAccount<T>(key, accountInfo.data);
        if (entry) {
          callback(entry);
        }
      },
      'confirmed'
    );

    const subscription: StateSubscription = {
      id: subscriptionId,
      unsubscribe: () => {
        this.client.anchorProvider.connection.removeAccountChangeListener(
          wsSubscriptionId
        );
        this.subscriptions.delete(subscriptionId);
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from all state subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Derive state account address from key
   * Uses a PDA derivation pattern
   */
  private deriveStateAccount(key: string): PublicKey {
    const programId = this.stateProgram || this.client.mxeProgramId;
    const [stateAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('encrypted_state'), Buffer.from(key)],
      programId
    );
    return stateAccount;
  }

  /**
   * Parse state account data into EncryptedStateEntry
   */
  private parseStateAccount<T>(
    key: string,
    data: Buffer
  ): EncryptedStateEntry<T> | null {
    try {
      // Basic parsing - actual structure depends on state program
      // Assuming: [discriminator(8)] [ciphertext(32)] [nonce(16)] [slot(8)]
      if (data.length < 64) {
        return null;
      }

      const ciphertext = new Uint8Array(data.slice(8, 40));
      const nonceBytes = data.slice(40, 56);
      const slot = data.readBigUInt64LE(56);

      return {
        key,
        encrypted: {
          ciphertext,
          publicKey: new Uint8Array(32), // Would need to be stored/fetched
          nonce: BigInt('0x' + nonceBytes.toString('hex')),
        },
        lastUpdateSlot: Number(slot),
      };
    } catch {
      return null;
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an EncryptedStateManager instance
 */
export function createEncryptedStateManager(
  config: EncryptedStateConfig
): EncryptedStateManager {
  return new EncryptedStateManager(config);
}
