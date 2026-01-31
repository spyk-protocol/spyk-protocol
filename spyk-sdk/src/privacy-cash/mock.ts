/**
 * MockPrivacyCash - Mock implementation for devnet testing
 *
 * Privacy Cash does not support devnet (no relayer service).
 * This mock provides a realistic simulation for testing and demos.
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  SpykConfig,
  PrivacyCashToken,
  TransactionCallbacks,
  ShieldResult,
  UnshieldResult,
  BalanceResult,
  InvalidAmountError,
  InsufficientBalanceError,
  TransactionError,
} from '../types';

// ============================================
// Constants
// ============================================

const USDC_DECIMALS = 6;
const MIN_SOL_RESERVE = 0.01 * LAMPORTS_PER_SOL;

// In-memory mock balances (per wallet)
const mockBalances = new Map<string, { SOL: bigint; USDC: bigint }>();

export interface MockPrivacyCashConfig {
  /** Log mock operations to console */
  logOperations?: boolean;
  /** Simulate delay for ZK proof generation (ms) */
  simulateProofDelay?: number;
  /** Actually send SOL to a burn address to simulate real deposit */
  useRealTransfers?: boolean;
}

/**
 * Mock Privacy Cash implementation for devnet testing
 *
 * Features:
 * - Simulates ZK proof generation with configurable delay
 * - Tracks mock balances in memory
 * - Optionally sends real SOL transfers (to simulate on-chain activity)
 * - Produces realistic transaction signatures
 *
 * @example
 * ```typescript
 * const mockPC = new MockPrivacyCash(config, connection, {
 *   logOperations: true,
 *   simulateProofDelay: 2000, // 2 seconds for "ZK proof"
 * });
 *
 * await mockPC.deposit(1); // Simulates shielding 1 SOL
 * ```
 */
export class MockPrivacyCash {
  private config: SpykConfig;
  private connection: Connection;
  private mockConfig: MockPrivacyCashConfig;
  private walletKey: string;

  constructor(
    config: SpykConfig,
    connection: Connection,
    mockConfig: MockPrivacyCashConfig = {}
  ) {
    this.config = config;
    this.connection = connection;
    this.mockConfig = {
      logOperations: true,
      simulateProofDelay: 1500,
      useRealTransfers: false,
      ...mockConfig,
    };
    this.walletKey = config.wallet.publicKey.toBase58();

    // Initialize mock balance for this wallet
    if (!mockBalances.has(this.walletKey)) {
      mockBalances.set(this.walletKey, { SOL: BigInt(0), USDC: BigInt(0) });
    }
  }

  get walletPublicKey(): PublicKey {
    return this.config.wallet.publicKey;
  }

  private log(message: string, data?: unknown) {
    if (this.mockConfig.logOperations) {
      console.log(`[MOCK PrivacyCash] ${message}`, data ? data : '');
    }
  }

  private async simulateZKProof(operation: string): Promise<void> {
    if (this.mockConfig.simulateProofDelay) {
      this.log(`Generating ZK proof for ${operation}...`);
      await new Promise((r) => setTimeout(r, this.mockConfig.simulateProofDelay));
      this.log(`ZK proof generated for ${operation}`);
    }
  }

  private getMockBalance(): { SOL: bigint; USDC: bigint } {
    return mockBalances.get(this.walletKey) || { SOL: BigInt(0), USDC: BigInt(0) };
  }

  private setMockBalance(token: 'SOL' | 'USDC', amount: bigint): void {
    const balance = this.getMockBalance();
    balance[token] = amount;
    mockBalances.set(this.walletKey, balance);
  }

  // ============================================
  // Shield (Deposit) Methods
  // ============================================

  async deposit(
    amount: number,
    callbacks?: TransactionCallbacks
  ): Promise<ShieldResult> {
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));

    // Check wallet balance
    const walletBalance = await this.connection.getBalance(this.walletPublicKey);
    const requiredBalance = Number(lamports) + MIN_SOL_RESERVE;

    if (walletBalance < requiredBalance) {
      throw new InsufficientBalanceError(
        BigInt(Math.floor(requiredBalance)),
        BigInt(walletBalance),
        'SOL'
      );
    }

    callbacks?.onSigning?.();
    this.log(`Depositing ${amount} SOL`);

    // Simulate ZK proof generation
    await this.simulateZKProof('deposit');

    let signature: string;

    if (this.mockConfig.useRealTransfers) {
      // Send real SOL to self (simulates on-chain activity)
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.walletPublicKey,
            toPubkey: this.walletPublicKey, // Send to self
            lamports: Number(lamports),
          })
        );
        signature = await sendAndConfirmTransaction(this.connection, tx, [this.config.wallet]);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        callbacks?.onError?.(err);
        throw new TransactionError(err.message);
      }
    } else {
      // Generate mock signature
      signature = `mock_deposit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    // Update mock balance
    const currentBalance = this.getMockBalance();
    this.setMockBalance('SOL', currentBalance.SOL + lamports);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.log(`Deposited ${amount} SOL`, { signature, newBalance: this.getMockBalance().SOL.toString() });

    return {
      signature,
      status: 'confirmed',
      protocol: 'privacy-cash',
      amount: lamports,
      token: 'SOL',
    };
  }

  async depositUSDC(
    amount: number,
    callbacks?: TransactionCallbacks
  ): Promise<ShieldResult> {
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const baseUnits = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

    callbacks?.onSigning?.();
    this.log(`Depositing ${amount} USDC`);

    // Simulate ZK proof generation
    await this.simulateZKProof('deposit USDC');

    const signature = `mock_deposit_usdc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Update mock balance
    const currentBalance = this.getMockBalance();
    this.setMockBalance('USDC', currentBalance.USDC + baseUnits);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.log(`Deposited ${amount} USDC`, { signature, newBalance: this.getMockBalance().USDC.toString() });

    return {
      signature,
      status: 'confirmed',
      protocol: 'privacy-cash',
      amount: baseUnits,
      token: 'USDC',
    };
  }

  // ============================================
  // Unshield (Withdraw) Methods
  // ============================================

  async withdraw(
    amount: number,
    destination?: PublicKey | string,
    callbacks?: TransactionCallbacks
  ): Promise<UnshieldResult> {
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
    const destAddress = destination
      ? (typeof destination === 'string' ? new PublicKey(destination) : destination)
      : this.walletPublicKey;

    // Check mock shielded balance
    const currentBalance = this.getMockBalance();
    if (currentBalance.SOL < lamports) {
      throw new InsufficientBalanceError(lamports, currentBalance.SOL, 'SOL (shielded)');
    }

    callbacks?.onSigning?.();
    this.log(`Withdrawing ${amount} SOL to ${destAddress.toBase58().slice(0, 8)}...`);

    // Simulate ZK proof generation
    await this.simulateZKProof('withdraw');

    let signature: string;
    const fee = BigInt(5000); // 0.000005 SOL mock fee

    if (this.mockConfig.useRealTransfers && destAddress.equals(this.walletPublicKey)) {
      // If withdrawing to self with real transfers, send from wallet
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.walletPublicKey,
            toPubkey: this.walletPublicKey,
            lamports: Number(lamports - fee),
          })
        );
        signature = await sendAndConfirmTransaction(this.connection, tx, [this.config.wallet]);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        callbacks?.onError?.(err);
        throw new TransactionError(err.message);
      }
    } else {
      signature = `mock_withdraw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    // Update mock balance
    this.setMockBalance('SOL', currentBalance.SOL - lamports);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.log(`Withdrew ${amount} SOL`, { signature, newBalance: this.getMockBalance().SOL.toString() });

    return {
      signature,
      status: 'confirmed',
      protocol: 'privacy-cash',
      amount: lamports - fee,
      token: 'SOL',
      destination: destAddress,
      fee,
      isPartial: false,
    };
  }

  async withdrawUSDC(
    amount: number,
    destination?: PublicKey | string,
    callbacks?: TransactionCallbacks
  ): Promise<UnshieldResult> {
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    const baseUnits = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));
    const destAddress = destination
      ? (typeof destination === 'string' ? new PublicKey(destination) : destination)
      : this.walletPublicKey;

    // Check mock shielded balance
    const currentBalance = this.getMockBalance();
    if (currentBalance.USDC < baseUnits) {
      throw new InsufficientBalanceError(baseUnits, currentBalance.USDC, 'USDC (shielded)');
    }

    callbacks?.onSigning?.();
    this.log(`Withdrawing ${amount} USDC to ${destAddress.toBase58().slice(0, 8)}...`);

    // Simulate ZK proof generation
    await this.simulateZKProof('withdraw USDC');

    const signature = `mock_withdraw_usdc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const fee = BigInt(1000); // Mock fee in base units

    // Update mock balance
    this.setMockBalance('USDC', currentBalance.USDC - baseUnits);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.log(`Withdrew ${amount} USDC`, { signature, newBalance: this.getMockBalance().USDC.toString() });

    return {
      signature,
      status: 'confirmed',
      protocol: 'privacy-cash',
      amount: baseUnits - fee,
      token: 'USDC',
      destination: destAddress,
      fee,
      isPartial: false,
    };
  }

  // ============================================
  // Balance Query
  // ============================================

  async getPrivateBalance(token: PrivacyCashToken): Promise<BalanceResult> {
    const balance = this.getMockBalance();
    const amount = token === 'SOL' ? balance.SOL : balance.USDC;

    this.log(`Getting ${token} balance: ${amount.toString()}`);

    return {
      token,
      amount,
      protocol: 'privacy-cash',
    };
  }

  async clearCache(): Promise<void> {
    this.log('Clearing cache (no-op in mock)');
  }

  // ============================================
  // Mock-specific Methods
  // ============================================

  /**
   * Set mock balance directly (for testing)
   */
  setBalance(token: 'SOL' | 'USDC', amount: bigint): void {
    this.setMockBalance(token, amount);
    this.log(`Set ${token} balance to ${amount.toString()}`);
  }

  /**
   * Reset all mock balances
   */
  resetBalances(): void {
    mockBalances.set(this.walletKey, { SOL: BigInt(0), USDC: BigInt(0) });
    this.log('Reset all balances to 0');
  }

  /**
   * Check if this is a mock implementation
   */
  static isMock(): boolean {
    return true;
  }
}
