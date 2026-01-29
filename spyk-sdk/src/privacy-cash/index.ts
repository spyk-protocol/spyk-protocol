/**
 * SpykPrivacyCash - Privacy Cash Protocol Wrapper
 * Enables shielding (deposit) and unshielding (withdraw) of SOL and USDC
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PrivacyCash } from 'privacycash';
import {
  SpykConfig,
  PrivacyCashToken,
  TransactionCallbacks,
  ShieldResult,
  UnshieldResult,
  BalanceResult,
  TransactionError,
  InsufficientBalanceError,
  InvalidAmountError,
} from '../types';
import { getRpcUrl } from '../utils/connection';

// ============================================
// Constants
// ============================================

/** USDC decimals on Solana */
const USDC_DECIMALS = 6;

/** Minimum SOL amount to keep for rent */
const MIN_SOL_RESERVE = 0.01 * LAMPORTS_PER_SOL;

// ============================================
// SpykPrivacyCash Class
// ============================================

/**
 * Privacy Cash protocol wrapper for shielding/unshielding assets
 *
 * Privacy Cash allows you to:
 * - Shield (deposit) SOL or USDC into a private pool
 * - Unshield (withdraw) from the private pool to any address
 *
 * @example
 * ```typescript
 * const privacyCash = new SpykPrivacyCash(config, connection);
 *
 * // Shield 1 SOL
 * const result = await privacyCash.deposit(1, {
 *   onConfirmed: (sig) => console.log('Shielded!', sig)
 * });
 *
 * // Unshield to another address
 * await privacyCash.withdraw(1, recipientAddress);
 * ```
 */
export class SpykPrivacyCash {
  private config: SpykConfig;
  private connection: Connection;
  private privacyCashClient: PrivacyCash;

  constructor(config: SpykConfig, connection: Connection) {
    this.config = config;
    this.connection = connection;

    // Initialize Privacy Cash SDK with the configured RPC provider
    const rpcUrl = getRpcUrl(config);
    this.privacyCashClient = new PrivacyCash({
      RPC_url: rpcUrl,
      owner: config.wallet,
      enableDebug: false,
    });
  }

  /**
   * Get the wallet's public key
   */
  get walletPublicKey(): PublicKey {
    return this.config.wallet.publicKey;
  }

  // ============================================
  // Shield (Deposit) Methods
  // ============================================

  /**
   * Shield SOL into the private pool
   * @param amount - Amount in SOL (not lamports)
   * @param callbacks - Optional lifecycle callbacks
   * @returns Shield result with transaction signature
   * @throws InvalidAmountError if amount is invalid
   * @throws InsufficientBalanceError if wallet has insufficient balance
   * @throws TransactionError if transaction fails
   */
  async deposit(
    amount: number,
    callbacks?: TransactionCallbacks
  ): Promise<ShieldResult> {
    // Validate amount
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Check balance
    const balance = await this.connection.getBalance(this.walletPublicKey);
    const requiredBalance = lamports + MIN_SOL_RESERVE;

    if (balance < requiredBalance) {
      throw new InsufficientBalanceError(
        BigInt(Math.floor(requiredBalance)),
        BigInt(balance),
        'SOL'
      );
    }

    callbacks?.onSigning?.();

    try {
      const result = await this.privacyCashClient.deposit({ lamports });

      callbacks?.onSent?.(result.tx);
      callbacks?.onConfirmed?.(result.tx);

      return {
        signature: result.tx,
        status: 'confirmed',
        protocol: 'privacy-cash',
        amount: BigInt(lamports),
        token: 'SOL',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw new TransactionError(err.message);
    }
  }

  /**
   * Shield USDC into the private pool
   * @param amount - Amount in USDC (with decimals, e.g., 100.50)
   * @param callbacks - Optional lifecycle callbacks
   * @returns Shield result with transaction signature
   * @throws InvalidAmountError if amount is invalid
   * @throws TransactionError if transaction fails
   */
  async depositUSDC(
    amount: number,
    callbacks?: TransactionCallbacks
  ): Promise<ShieldResult> {
    // Validate amount
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const baseUnits = Math.floor(amount * Math.pow(10, USDC_DECIMALS));

    callbacks?.onSigning?.();

    try {
      const result = await this.privacyCashClient.depositUSDC({ base_units: baseUnits });

      callbacks?.onSent?.(result.tx);
      callbacks?.onConfirmed?.(result.tx);

      return {
        signature: result.tx,
        status: 'confirmed',
        protocol: 'privacy-cash',
        amount: BigInt(baseUnits),
        token: 'USDC',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw new TransactionError(err.message);
    }
  }

  // ============================================
  // Unshield (Withdraw) Methods
  // ============================================

  /**
   * Unshield SOL from the private pool to a destination
   * @param amount - Amount in SOL (not lamports)
   * @param destination - Recipient address (optional, defaults to wallet)
   * @param callbacks - Optional lifecycle callbacks
   * @returns Unshield result with transaction signature
   */
  async withdraw(
    amount: number,
    destination?: PublicKey | string,
    callbacks?: TransactionCallbacks
  ): Promise<UnshieldResult> {
    // Validate amount
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const destinationAddress = destination
      ? (typeof destination === 'string' ? destination : destination.toBase58())
      : undefined;

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    callbacks?.onSigning?.();

    try {
      const result = await this.privacyCashClient.withdraw({
        lamports,
        recipientAddress: destinationAddress,
      });

      callbacks?.onSent?.(result.tx);
      callbacks?.onConfirmed?.(result.tx);

      return {
        signature: result.tx,
        status: 'confirmed',
        protocol: 'privacy-cash',
        amount: BigInt(result.amount_in_lamports),
        token: 'SOL',
        destination: new PublicKey(result.recipient),
        fee: BigInt(result.fee_in_lamports),
        isPartial: result.isPartial,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw new TransactionError(err.message);
    }
  }

  /**
   * Unshield USDC from the private pool to a destination
   * @param amount - Amount in USDC
   * @param destination - Recipient address (optional, defaults to wallet)
   * @param callbacks - Optional lifecycle callbacks
   * @returns Unshield result with transaction signature
   */
  async withdrawUSDC(
    amount: number,
    destination?: PublicKey | string,
    callbacks?: TransactionCallbacks
  ): Promise<UnshieldResult> {
    // Validate amount
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const destinationAddress = destination
      ? (typeof destination === 'string' ? destination : destination.toBase58())
      : undefined;

    const baseUnits = Math.floor(amount * Math.pow(10, USDC_DECIMALS));

    callbacks?.onSigning?.();

    try {
      const result = await this.privacyCashClient.withdrawUSDC({
        base_units: baseUnits,
        recipientAddress: destinationAddress,
      });

      callbacks?.onSent?.(result.tx);
      callbacks?.onConfirmed?.(result.tx);

      return {
        signature: result.tx,
        status: 'confirmed',
        protocol: 'privacy-cash',
        amount: BigInt(result.base_units),
        token: 'USDC',
        destination: new PublicKey(result.recipient),
        fee: BigInt(result.fee_base_units),
        isPartial: result.isPartial,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw new TransactionError(err.message);
    }
  }

  // ============================================
  // Balance Query
  // ============================================

  /**
   * Get private (shielded) balance for a token
   * @param token - Token to query (SOL or USDC)
   * @returns Balance result
   */
  async getPrivateBalance(token: PrivacyCashToken): Promise<BalanceResult> {
    try {
      if (token === 'SOL') {
        const result = await this.privacyCashClient.getPrivateBalance();
        return {
          token,
          amount: BigInt(result.lamports),
          protocol: 'privacy-cash',
        };
      } else if (token === 'USDC') {
        const result = await this.privacyCashClient.getPrivateBalanceUSDC();
        return {
          token,
          amount: BigInt(result.base_units),
          protocol: 'privacy-cash',
        };
      }

      return {
        token,
        amount: BigInt(0),
        protocol: 'privacy-cash',
      };
    } catch (error) {
      // Return zero balance on error (e.g., no account exists)
      return {
        token,
        amount: BigInt(0),
        protocol: 'privacy-cash',
      };
    }
  }

  /**
   * Clear the Privacy Cash SDK cache
   * Useful when balances seem stale
   */
  async clearCache(): Promise<void> {
    await this.privacyCashClient.clearCache();
  }
}
