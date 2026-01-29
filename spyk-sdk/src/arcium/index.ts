/**
 * Spyk Arcium Integration
 *
 * Encrypted DeFi operations using Arcium's MXE (Multi-party eXecution Environment).
 *
 * Features:
 * - Private swaps with hidden order sizes
 * - Confidential lending/borrowing
 * - Encrypted shared state management
 * - Integration with Privacy Cash and ShadowWire
 *
 * @example
 * ```typescript
 * import { SpykArcium } from '@spyk-protocol/sdk';
 *
 * const arcium = new SpykArcium({
 *   provider: anchorProvider,
 *   programId: myMxeProgramId,
 *   wallet: myWallet,
 * });
 *
 * // Initialize encryption
 * await arcium.initialize();
 *
 * // Execute private swap
 * const result = await arcium.swap.executeSwap({
 *   inputMint: SOL_MINT,
 *   outputMint: USDC_MINT,
 *   amount: BigInt(1_000_000_000),
 *   minOutputAmount: BigInt(95_000_000),
 * });
 *
 * // Private lending
 * await arcium.lending.deposit({
 *   tokenMint: USDC_MINT,
 *   amount: BigInt(1_000_000_000),
 *   enableCollateral: true,
 * });
 * ```
 *
 * @packageDocumentation
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Core client
export { ArciumClient, createArciumClient } from './client';

// Encrypted state management
export {
  EncryptedStateManager,
  createEncryptedStateManager,
  type StateWriteParams,
  type StateReadParams,
  type EncryptedStateConfig,
} from './encrypted-state';

// Private swap operations
export {
  PrivateSwap,
  createPrivateSwap,
  TOKEN_MINTS,
  type SwapPoolConfig,
  type PrivateSwapQuote,
  type PrivateSwapConfig,
} from './private-swap';

// Private lending operations
export {
  PrivateLending,
  createPrivateLending,
  type LendingMarketConfig,
  type ReserveConfig,
  type PrivateLendingConfig,
  type PositionSummary,
} from './lending';

// Types
export * from './types';

// ============================================
// Unified SpykArcium Class
// ============================================

import { ArciumClient, createArciumClient } from './client';
import { EncryptedStateManager, createEncryptedStateManager } from './encrypted-state';
import { PrivateSwap, createPrivateSwap } from './private-swap';
import { PrivateLending, createPrivateLending } from './lending';
import { ArciumEnvConfig, ArciumError, ArciumErrorCodes } from './types';

/** Configuration for SpykArcium */
export interface SpykArciumConfig {
  /** Anchor provider for Solana connection */
  provider: anchor.AnchorProvider;
  /** MXE program ID */
  programId: PublicKey;
  /** Wallet for signing transactions */
  wallet: Keypair;
  /** Auto-initialize encryption on construction */
  autoInitialize?: boolean;
}

/**
 * Unified Arcium integration for Spyk Protocol
 *
 * Provides a single entry point for all encrypted DeFi operations:
 * - Private swaps (MEV-protected, hidden order sizes)
 * - Confidential lending/borrowing
 * - Encrypted state management
 *
 * Integrates seamlessly with Privacy Cash and ShadowWire for
 * maximum transaction privacy.
 *
 * @example
 * ```typescript
 * import { SpykArcium } from '@spyk-protocol/sdk';
 *
 * // Create instance
 * const arcium = new SpykArcium({
 *   provider: anchorProvider,
 *   programId: myProgramId,
 *   wallet: myWallet,
 * });
 *
 * // Initialize (fetches MXE keys, sets up encryption)
 * await arcium.initialize();
 *
 * // Private swap
 * const swapResult = await arcium.swap.executeSwap({
 *   inputMint: SOL_MINT,
 *   outputMint: USDC_MINT,
 *   amount: BigInt(1_000_000_000),
 *   minOutputAmount: BigInt(0),
 * });
 *
 * // Private lending
 * const lendResult = await arcium.lending.deposit({
 *   tokenMint: USDC_MINT,
 *   amount: BigInt(1_000_000_000),
 *   enableCollateral: true,
 * });
 *
 * // Encrypted state
 * await arcium.state.write({
 *   key: 'my-private-value',
 *   value: BigInt(42),
 *   operation: 'set',
 * });
 * ```
 */
export class SpykArcium {
  /** Core Arcium client */
  public readonly client: ArciumClient;

  /** Private swap operations */
  public readonly swap: PrivateSwap;

  /** Private lending operations */
  public readonly lending: PrivateLending;

  /** Encrypted state management */
  public readonly state: EncryptedStateManager;

  private wallet: Keypair;
  private initialized = false;

  constructor(config: SpykArciumConfig) {
    this.wallet = config.wallet;

    // Create core client
    this.client = createArciumClient({
      provider: config.provider,
      programId: config.programId,
    });

    // Create operation modules
    this.swap = createPrivateSwap({
      client: this.client,
      wallet: config.wallet,
    });

    this.lending = createPrivateLending({
      client: this.client,
      wallet: config.wallet,
    });

    this.state = createEncryptedStateManager({
      client: this.client,
    });

    // Auto-initialize if requested
    if (config.autoInitialize) {
      // Note: Can't await in constructor, user should call initialize()
      console.warn('autoInitialize is set but initialize() must be called manually');
    }
  }

  /**
   * Initialize encryption context
   *
   * Must be called before any encrypted operations.
   * Fetches MXE public key and derives shared secret.
   *
   * @param useDeterministicKeys - If true, derives encryption keys from wallet
   */
  async initialize(useDeterministicKeys = true): Promise<void> {
    if (this.initialized) {
      console.warn('SpykArcium already initialized');
      return;
    }

    await this.client.initializeEncryption(
      useDeterministicKeys ? this.wallet : undefined
    );

    this.initialized = true;
    console.log('SpykArcium initialized successfully');
  }

  /**
   * Check if encryption is initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the MXE program ID
   */
  get programId(): PublicKey {
    return this.client.mxeProgramId;
  }

  /**
   * Get the wallet public key
   */
  get walletPublicKey(): PublicKey {
    return this.wallet.publicKey;
  }

  /**
   * Ensure initialization before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ArciumError(
        'SpykArcium not initialized. Call initialize() first.',
        ArciumErrorCodes.MXE_NOT_INITIALIZED
      );
    }
  }

  // ============================================
  // Convenience Methods
  // ============================================

  /**
   * Encrypt a value for MXE computation
   *
   * @param value - Value to encrypt
   * @returns Encrypted value with metadata
   */
  encrypt(value: bigint): ReturnType<ArciumClient['encrypt']> {
    this.ensureInitialized();
    return this.client.encrypt([value]);
  }

  /**
   * Execute a private swap with Privacy Cash funding
   *
   * Combines Privacy Cash unshielding with encrypted swap execution.
   */
  async swapWithPrivacyCash(
    params: Parameters<PrivateSwap['executeSwapWithPrivacyCashFunding']>[0],
    options?: Parameters<PrivateSwap['executeSwapWithPrivacyCashFunding']>[1]
  ): ReturnType<PrivateSwap['executeSwapWithPrivacyCashFunding']> {
    this.ensureInitialized();
    return this.swap.executeSwapWithPrivacyCashFunding(params, options);
  }

  /**
   * Deposit to lending from Privacy Cash
   *
   * Combines Privacy Cash unshielding with encrypted lending deposit.
   */
  async depositToLendingFromPrivacyCash(
    tokenMint: PublicKey,
    amount: bigint,
    options?: Parameters<PrivateLending['depositFromPrivacyCash']>[2]
  ): ReturnType<PrivateLending['depositFromPrivacyCash']> {
    this.ensureInitialized();
    return this.lending.depositFromPrivacyCash(tokenMint, amount, options);
  }

  /**
   * Withdraw from lending to Privacy Cash
   *
   * Withdraws and re-shields tokens into Privacy Cash.
   */
  async withdrawFromLendingToPrivacyCash(
    tokenMint: PublicKey,
    amount: bigint,
    options?: Parameters<PrivateLending['withdrawToPrivacyCash']>[2]
  ): ReturnType<PrivateLending['withdrawToPrivacyCash']> {
    this.ensureInitialized();
    return this.lending.withdrawToPrivacyCash(tokenMint, amount, options);
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a SpykArcium instance
 *
 * @example
 * ```typescript
 * const arcium = createSpykArcium({
 *   provider: anchorProvider,
 *   programId: myProgramId,
 *   wallet: myWallet,
 * });
 *
 * await arcium.initialize();
 * ```
 */
export function createSpykArcium(config: SpykArciumConfig): SpykArcium {
  return new SpykArcium(config);
}
