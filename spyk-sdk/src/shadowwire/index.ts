/**
 * SpykShadowWire - ShadowWire Protocol Wrapper
 * Enables private transfers with multi-token support using Radr's ShadowWire SDK
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ShadowWireClient,
  TokenUtils,
  SUPPORTED_TOKENS as SHADOWWIRE_SUPPORTED_TOKENS,
  TOKEN_DECIMALS,
  TOKEN_FEES,
  TOKEN_MINIMUMS,
  type TokenSymbol,
} from '@radr/shadowwire';
import {
  SpykConfig,
  ShadowWireToken,
  TransferType,
  TransactionCallbacks,
  TransferResult,
  BalanceResult,
  TransactionError,
  InsufficientBalanceError,
  InvalidAddressError,
  InvalidAmountError,
} from '../types';

// ============================================
// Types
// ============================================

/** Parameters for a transfer */
export interface TransferParams {
  /** Recipient address (ShadowWire account or public address) */
  to: PublicKey | string;
  /** Amount to transfer (in token units with decimals) */
  amount: number;
  /** Token to transfer */
  token: ShadowWireToken;
  /** Transfer type (internal/external). Auto-detected if not specified */
  type?: TransferType;
}

/** Wallet adapter for signing */
interface WalletSignAdapter {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

// ============================================
// SpykShadowWire Class
// ============================================

/**
 * ShadowWire protocol wrapper for private transfers
 *
 * ShadowWire enables:
 * - Internal transfers: Fully private between ShadowWire accounts
 * - External transfers: Sender anonymous, recipient is public address
 * - Multi-token support: SOL, USDC, BONK, RADR, ORE, and 17 more tokens
 *
 * @example
 * ```typescript
 * const shadowWire = new SpykShadowWire(config, connection);
 *
 * // Private transfer
 * const result = await shadowWire.transfer({
 *   to: recipientAddress,
 *   amount: 100,
 *   token: 'BONK'
 * });
 * ```
 */
export class SpykShadowWire {
  private config: SpykConfig;
  private connection: Connection;
  private client: ShadowWireClient;

  constructor(config: SpykConfig, connection: Connection) {
    this.config = config;
    this.connection = connection;

    // Initialize ShadowWire client
    this.client = new ShadowWireClient({
      debug: false,
    });
  }

  /**
   * Get the wallet's public key
   */
  get walletPublicKey(): PublicKey {
    return this.config.wallet.publicKey;
  }

  // ============================================
  // Transfer Methods
  // ============================================

  /**
   * Execute a private transfer via ShadowWire
   *
   * If `type` is not specified, defaults to 'external' (anonymous sender).
   * Use 'internal' for fully private transfers between ShadowWire accounts.
   *
   * @param params - Transfer parameters
   * @param callbacks - Optional lifecycle callbacks
   * @returns Transfer result with transaction signature
   * @throws InvalidAmountError if amount is invalid
   * @throws InvalidAddressError if recipient address is invalid
   * @throws InsufficientBalanceError if sender has insufficient balance
   * @throws TransactionError if transaction fails
   */
  async transfer(
    params: TransferParams,
    callbacks?: TransactionCallbacks
  ): Promise<TransferResult> {
    const { to, amount, token, type = 'external' } = params;

    // Validate amount
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    // Validate minimum amount
    const minimum = this.getMinimumAmount(token);
    if (amount < minimum) {
      throw new InvalidAmountError(`Amount ${amount} is below minimum ${minimum} for ${token}`);
    }

    // Validate and parse recipient address
    let recipientAddress: string;
    try {
      recipientAddress = typeof to === 'string' ? to : to.toBase58();
      // Validate it's a valid public key
      new PublicKey(recipientAddress);
    } catch {
      throw new InvalidAddressError(typeof to === 'string' ? to : to.toBase58());
    }

    callbacks?.onSigning?.();

    try {
      // Create wallet adapter for signing
      const walletAdapter = this.createWalletAdapter();

      const result = await this.client.transfer({
        sender: this.walletPublicKey.toBase58(),
        recipient: recipientAddress,
        amount,
        token: token as TokenSymbol,
        type,
        wallet: walletAdapter,
      });

      const signature = result.tx_signature || 'pending';

      callbacks?.onSent?.(signature);
      callbacks?.onConfirmed?.(signature);

      return {
        signature,
        status: 'confirmed',
        protocol: 'shadowwire',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);

      // Check for specific error types
      if (err.message.includes('insufficient') || err.message.includes('balance')) {
        throw new InsufficientBalanceError(BigInt(0), BigInt(0), token, true);
      }

      throw new TransactionError(err.message);
    }
  }

  /**
   * Check if an address has a ShadowWire account
   * @param address - Address to check
   * @returns True if the address has a ShadowWire account with balance
   */
  async hasShadowWireAccount(address: PublicKey | string): Promise<boolean> {
    try {
      const addressStr = typeof address === 'string' ? address : address.toBase58();
      const balance = await this.client.getBalance(addressStr);
      return balance && balance.available > 0;
    } catch {
      return false;
    }
  }

  // ============================================
  // Balance Query
  // ============================================

  /**
   * Get balance for a token in ShadowWire
   * @param token - Token to query
   * @returns Balance result
   */
  async getBalance(token: ShadowWireToken): Promise<BalanceResult> {
    try {
      const balance = await this.client.getBalance(
        this.walletPublicKey.toBase58(),
        token as TokenSymbol
      );

      // Convert to smallest units
      const decimals = this.getTokenDecimals(token);
      const amountInSmallestUnit = BigInt(
        Math.floor((balance?.available || 0) * Math.pow(10, decimals))
      );

      return {
        token,
        amount: amountInSmallestUnit,
        protocol: 'shadowwire',
      };
    } catch {
      return {
        token,
        amount: BigInt(0),
        protocol: 'shadowwire',
      };
    }
  }

  // ============================================
  // Fee & Utility Methods
  // ============================================

  /**
   * Get fee percentage for a token
   * @param token - Token symbol
   * @returns Fee percentage (e.g., 0.5 for 0.5%)
   */
  getFeePercentage(token: ShadowWireToken): number {
    return this.client.getFeePercentage(token as TokenSymbol);
  }

  /**
   * Get minimum transfer amount for a token
   * @param token - Token symbol
   * @returns Minimum amount in token units
   */
  getMinimumAmount(token: ShadowWireToken): number {
    return this.client.getMinimumAmount(token as TokenSymbol);
  }

  /**
   * Calculate fee for a transfer
   * @param amount - Amount to transfer
   * @param token - Token symbol
   * @returns Fee breakdown
   */
  calculateFee(amount: number, token: ShadowWireToken): {
    fee: number;
    feePercentage: number;
    netAmount: number;
  } {
    return this.client.calculateFee(amount, token as TokenSymbol);
  }

  /**
   * Get supported tokens
   * @returns Array of officially supported token symbols
   */
  getSupportedTokens(): string[] {
    return [...SHADOWWIRE_SUPPORTED_TOKENS];
  }

  /**
   * Check if a token is supported
   * @param token - Token symbol to check
   * @returns True if officially supported
   */
  isTokenSupported(token: string): boolean {
    return SHADOWWIRE_SUPPORTED_TOKENS.includes(token.toUpperCase() as TokenSymbol);
  }

  /**
   * Get decimals for a token
   * @param token - Token symbol
   * @returns Number of decimals
   */
  getTokenDecimals(token: string): number {
    const upperToken = token.toUpperCase() as TokenSymbol;
    return TOKEN_DECIMALS[upperToken] ?? 9;
  }

  // ============================================
  // Internal Methods
  // ============================================

  /**
   * Create a wallet adapter for signing messages
   */
  private createWalletAdapter(): WalletSignAdapter {
    const keypair = this.config.wallet;

    return {
      signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
        // Use nacl or tweetnacl for signing
        // The keypair.secretKey contains both private and public key
        const { sign } = await import('@noble/ed25519');
        const signature = await sign(message, keypair.secretKey.slice(0, 32));
        return signature;
      },
    };
  }
}
