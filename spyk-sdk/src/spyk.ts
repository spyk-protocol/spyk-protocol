/**
 * Spyk - Unified Privacy SDK
 * Single entry point for Privacy Cash and ShadowWire protocols
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  SpykConfig,
  SupportedToken,
  PrivacyCashToken,
  TransactionCallbacks,
  TransferResult,
  BalanceResult,
  UnsupportedTokenError,
} from './types';
import { createConnection } from './utils/connection';
import { SpykPrivacyCash } from './privacy-cash';
import { SpykShadowWire, TransferParams } from './shadowwire';

// ============================================
// Constants
// ============================================

/** Tokens supported by Privacy Cash (deposit/withdraw) */
const PRIVACY_CASH_TOKENS = new Set<string>(['SOL', 'USDC']);

// ============================================
// Types
// ============================================

/** Balance aggregation from both protocols */
export interface AggregatedBalances {
  /** Balances from Privacy Cash (shielded) */
  privacyCash: {
    SOL: bigint;
    USDC: bigint;
  };
  /** Balances from ShadowWire */
  shadowWire: Map<string, bigint>;
}

// ============================================
// Spyk Class
// ============================================

/**
 * Unified Spyk SDK - Single interface for privacy transactions on Solana
 *
 * The Spyk class provides a unified API for both Privacy Cash and ShadowWire
 * protocols, automatically routing operations to the appropriate protocol
 * based on the token type.
 *
 * **Protocol Routing:**
 * - SOL/USDC → Privacy Cash (supports deposit/withdraw/transfer)
 * - Other tokens (BONK, RADR, ORE, etc.) → ShadowWire (transfer only)
 *
 * @example
 * ```typescript
 * import { Spyk } from '@spyk-protocol/sdk';
 *
 * // 3-line integration
 * const spyk = new Spyk({
 *   heliusApiKey: process.env.HELIUS_API_KEY!,
 *   network: 'mainnet',
 *   wallet: myKeypair,
 * });
 *
 * // Shield SOL into private pool
 * await spyk.deposit('SOL', 1);
 *
 * // Private transfer (auto-routes based on token)
 * await spyk.transfer({
 *   to: recipientAddress,
 *   amount: 100,
 *   token: 'BONK',
 * });
 *
 * // Unshield USDC from private pool
 * await spyk.withdraw('USDC', 50);
 * ```
 */
export class Spyk {
  /** Privacy Cash protocol wrapper (SOL/USDC shielding) */
  public readonly privacyCash: SpykPrivacyCash;

  /** ShadowWire protocol wrapper (multi-token private transfers) */
  public readonly shadowWire: SpykShadowWire;

  private connection: Connection;
  private config: SpykConfig;

  /**
   * Create a new Spyk instance
   * @param config - SDK configuration with RPC provider, network, and wallet
   */
  constructor(config: SpykConfig) {
    this.config = config;
    this.connection = createConnection(config);
    this.privacyCash = new SpykPrivacyCash(config, this.connection);
    this.shadowWire = new SpykShadowWire(config, this.connection);
  }

  /**
   * Get the RPC connection
   */
  get rpcConnection(): Connection {
    return this.connection;
  }

  /**
   * Get the wallet's public key
   */
  get walletPublicKey(): PublicKey {
    return this.config.wallet.publicKey;
  }

  // ============================================
  // Unified Methods
  // ============================================

  /**
   * Execute a private transfer, routing to the appropriate protocol
   *
   * - SOL/USDC: Uses Privacy Cash for fully shielded transfers
   * - Other tokens: Uses ShadowWire for anonymous transfers
   *
   * @param params - Transfer parameters
   * @param callbacks - Optional lifecycle callbacks
   * @returns Transfer result
   */
  async transfer(
    params: TransferParams,
    callbacks?: TransactionCallbacks
  ): Promise<TransferResult> {
    const { token } = params;
    const upperToken = token.toUpperCase();

    // Route based on token
    if (PRIVACY_CASH_TOKENS.has(upperToken)) {
      // For Privacy Cash tokens, use ShadowWire for direct transfers
      // (Privacy Cash is better for deposit/withdraw flow)
      return this.shadowWire.transfer(params, callbacks);
    }

    // Use ShadowWire for all other tokens
    return this.shadowWire.transfer(params, callbacks);
  }

  /**
   * Deposit (shield) tokens into the private pool
   *
   * Only supported for SOL and USDC via Privacy Cash protocol.
   *
   * @param token - Token to shield (SOL or USDC)
   * @param amount - Amount in token units
   * @param callbacks - Optional lifecycle callbacks
   * @returns Shield result
   * @throws UnsupportedTokenError if token is not SOL or USDC
   */
  async deposit(
    token: PrivacyCashToken,
    amount: number,
    callbacks?: TransactionCallbacks
  ): Promise<TransferResult> {
    const upperToken = token.toUpperCase();

    if (!PRIVACY_CASH_TOKENS.has(upperToken)) {
      throw new UnsupportedTokenError(
        token,
        'privacy-cash'
      );
    }

    if (upperToken === 'SOL') {
      return this.privacyCash.deposit(amount, callbacks);
    } else {
      return this.privacyCash.depositUSDC(amount, callbacks);
    }
  }

  /**
   * Withdraw (unshield) tokens from the private pool
   *
   * Only supported for SOL and USDC via Privacy Cash protocol.
   *
   * @param token - Token to unshield (SOL or USDC)
   * @param amount - Amount in token units
   * @param destination - Optional destination (defaults to wallet)
   * @param callbacks - Optional lifecycle callbacks
   * @returns Unshield result
   * @throws UnsupportedTokenError if token is not SOL or USDC
   */
  async withdraw(
    token: PrivacyCashToken,
    amount: number,
    destination?: PublicKey | string,
    callbacks?: TransactionCallbacks
  ): Promise<TransferResult> {
    const upperToken = token.toUpperCase();

    if (!PRIVACY_CASH_TOKENS.has(upperToken)) {
      throw new UnsupportedTokenError(
        token,
        'privacy-cash'
      );
    }

    const dest = destination || this.walletPublicKey;

    if (upperToken === 'SOL') {
      return this.privacyCash.withdraw(amount, dest, callbacks);
    } else {
      return this.privacyCash.withdrawUSDC(amount, dest, callbacks);
    }
  }

  /**
   * Get balance for a specific token or aggregate all balances
   *
   * @param token - Optional token to query. If not specified, returns all balances.
   * @returns Balance result or aggregated balances
   */
  async getBalance(token?: SupportedToken): Promise<BalanceResult | AggregatedBalances> {
    if (token) {
      const upperToken = token.toUpperCase();

      if (PRIVACY_CASH_TOKENS.has(upperToken)) {
        return this.privacyCash.getPrivateBalance(upperToken as PrivacyCashToken);
      }

      return this.shadowWire.getBalance(token);
    }

    // Aggregate balances from both protocols
    const [solBalance, usdcBalance] = await Promise.all([
      this.privacyCash.getPrivateBalance('SOL'),
      this.privacyCash.getPrivateBalance('USDC'),
    ]);

    return {
      privacyCash: {
        SOL: solBalance.amount,
        USDC: usdcBalance.amount,
      },
      shadowWire: new Map(),
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if a token supports deposit/withdraw (Privacy Cash)
   * @param token - Token symbol
   * @returns True if token supports deposit/withdraw
   */
  supportsDeposit(token: string): boolean {
    return PRIVACY_CASH_TOKENS.has(token.toUpperCase());
  }

  /**
   * Get the appropriate protocol for a token
   * @param token - Token symbol
   * @returns Protocol name
   */
  getProtocolForToken(token: string): 'privacy-cash' | 'shadowwire' {
    return PRIVACY_CASH_TOKENS.has(token.toUpperCase()) ? 'privacy-cash' : 'shadowwire';
  }
}
