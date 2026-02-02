/**
 * MockPrivacyCash - Mock implementation for devnet testing
 *
 * Privacy Cash does not support devnet (no relayer service).
 * This mock provides a realistic simulation for testing and demos.
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, TransactionInstruction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
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

// Memo Program ID (SPL Memo)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Circle's Official USDC Devnet Mint
// Faucet: https://faucet.circle.com/ (20 USDC per 2 hours)
const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// File-based mock balances for persistence across CLI invocations
const BALANCE_FILE = path.join(process.cwd(), 'cache', 'mock-balances.json');

// Ensure cache directory exists
function ensureCacheDir(): void {
  const cacheDir = path.dirname(BALANCE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

// Load balances from file
function loadBalancesFromFile(): Map<string, { SOL: bigint; USDC: bigint }> {
  ensureCacheDir();
  try {
    if (fs.existsSync(BALANCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(BALANCE_FILE, 'utf-8'));
      const map = new Map<string, { SOL: bigint; USDC: bigint }>();
      for (const [key, value] of Object.entries(data)) {
        const v = value as { SOL: string; USDC: string };
        map.set(key, { SOL: BigInt(v.SOL), USDC: BigInt(v.USDC) });
      }
      return map;
    }
  } catch (e) {
    // Ignore errors, start fresh
  }
  return new Map();
}

// Save balances to file
function saveBalancesToFile(balances: Map<string, { SOL: bigint; USDC: bigint }>): void {
  ensureCacheDir();
  const obj: Record<string, { SOL: string; USDC: string }> = {};
  for (const [key, value] of balances.entries()) {
    obj[key] = { SOL: value.SOL.toString(), USDC: value.USDC.toString() };
  }
  fs.writeFileSync(BALANCE_FILE, JSON.stringify(obj, null, 2));
}

// File-persisted mock balances (per wallet)
const mockBalances = loadBalancesFromFile();

// ============================================
// Console Colors for Demo Visibility
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  white: '\x1b[37m',

  // Background colors
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const icons = {
  shield: '\u{1F6E1}',      // Shield emoji
  money: '\u{1F4B0}',       // Money bag
  lock: '\u{1F512}',        // Lock
  unlock: '\u{1F513}',      // Unlock
  check: '\u{2705}',        // Check mark
  hourglass: '\u{23F3}',    // Hourglass
  sparkles: '\u{2728}',     // Sparkles
  warning: '\u{26A0}',      // Warning
  zap: '\u{26A1}',          // Zap
  gear: '\u{2699}',         // Gear
  chart: '\u{1F4CA}',       // Chart
};

export interface MockPrivacyCashConfig {
  /** Log mock operations to console */
  logOperations?: boolean;
  /** Simulate delay for ZK proof generation (ms) */
  simulateProofDelay?: number;
  /** Send real devnet transactions (shows on Solscan) */
  useRealTransfers?: boolean;
  /** Show colorful output (default: true) */
  colorfulOutput?: boolean;
  /** Show progress indicators during ZK proof simulation */
  showProgress?: boolean;
  /** Memo prefix for real transactions */
  memoPrefix?: string;
}

/**
 * Mock Privacy Cash implementation for devnet testing
 *
 * Features:
 * - Simulates ZK proof generation with configurable delay
 * - Tracks mock balances in memory
 * - Optionally sends real SOL transfers (to simulate on-chain activity)
 * - Produces realistic transaction signatures
 * - Colorful console output for demo visibility
 * - Progress indicators during ZK proof generation
 *
 * @example
 * ```typescript
 * const mockPC = new MockPrivacyCash(config, connection, {
 *   logOperations: true,
 *   simulateProofDelay: 2000, // 2 seconds for "ZK proof"
 *   colorfulOutput: true,
 * });
 *
 * await mockPC.deposit(1); // Simulates shielding 1 SOL
 * ```
 */
export class MockPrivacyCash {
  private config: SpykConfig;
  private connection: Connection;
  private mockConfig: Required<MockPrivacyCashConfig>;
  private walletKey: string;
  private operationCount = 0;

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
      useRealTransfers: true, // Default to real devnet transactions for demo
      colorfulOutput: true,
      showProgress: true,
      memoPrefix: 'SPYK-PC',
      ...mockConfig,
    };
    this.walletKey = config.wallet.publicKey.toBase58();

    // Initialize mock balance for this wallet
    if (!mockBalances.has(this.walletKey)) {
      mockBalances.set(this.walletKey, { SOL: BigInt(0), USDC: BigInt(0) });
    }

    // Log initialization banner if logging is enabled
    if (this.mockConfig.logOperations) {
      this.logBanner();
    }
  }

  get walletPublicKey(): PublicKey {
    return this.config.wallet.publicKey;
  }

  // ============================================
  // Logging Utilities
  // ============================================

  private c(color: keyof typeof colors, text: string): string {
    if (!this.mockConfig.colorfulOutput) return text;
    return `${colors[color]}${text}${colors.reset}`;
  }

  private logBanner(): void {
    const realTxNote = this.mockConfig.useRealTransfers
      ? this.c('green', `${icons.check} SOL txs produce real Solscan links`)
      : this.c('dim', '   In-memory mode (no real transactions)');

    const banner = `
${this.c('cyan', '╔════════════════════════════════════════════════════════════╗')}
${this.c('cyan', '║')}  ${this.c('bright', this.c('magenta', icons.shield + ' PRIVACY CASH'))} ${this.c('dim', '(Devnet)')}                      ${this.c('cyan', '║')}
${this.c('cyan', '╠════════════════════════════════════════════════════════════╣')}
${this.c('cyan', '║')}  ${this.c('green', icons.check + ' ZK-powered private transfers')}                          ${this.c('cyan', '║')}
${this.c('cyan', '║')}  ${this.c('dim', '   Shielded balance tracking enabled')}                    ${this.c('cyan', '║')}
${this.c('cyan', '║')}  ${realTxNote.padEnd(48)}${this.c('cyan', '║')}
${this.c('cyan', '║')}  ${this.c('blue', 'USDC Faucet: https://faucet.circle.com/')}         ${this.c('cyan', '║')}
${this.c('cyan', '╚════════════════════════════════════════════════════════════╝')}
`;
    console.log(banner);
    console.log(this.c('dim', `  Wallet: ${this.walletKey.slice(0, 8)}...${this.walletKey.slice(-4)}`));
    console.log();
  }

  private log(message: string, data?: unknown) {
    if (!this.mockConfig.logOperations) return;

    const prefix = this.c('magenta', `[${icons.shield} PC]`);
    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  private logOperation(type: 'deposit' | 'withdraw', token: 'SOL' | 'USDC', amount: number): void {
    // Always increment operation count for tracking
    this.operationCount++;

    if (!this.mockConfig.logOperations) return;
    const icon = type === 'deposit' ? icons.lock : icons.unlock;
    const action = type === 'deposit' ? 'SHIELDING' : 'UNSHIELDING';
    const color = type === 'deposit' ? 'green' : 'cyan';

    console.log();
    console.log(this.c('bright', `${icon} ${this.c(color, `${action} ${amount} ${token}`)}`));
    console.log(this.c('dim', `   Operation #${this.operationCount}`));
  }

  private logSuccess(type: 'deposit' | 'withdraw', token: 'SOL' | 'USDC', amount: number, signature: string, isRealTx: boolean = false): void {
    if (!this.mockConfig.logOperations) return;

    const action = type === 'deposit' ? 'Shielded' : 'Unshielded';
    const balance = this.getMockBalance();
    const currentBalance = token === 'SOL' ? balance.SOL : balance.USDC;
    const formattedBalance = this.formatBalance(currentBalance, token);

    console.log();
    console.log(this.c('green', `${icons.check} ${action} successfully!`));
    console.log(this.c('dim', `   Signature: ${signature.slice(0, 20)}...`));

    // Show Solscan link for real devnet transactions
    if (isRealTx) {
      const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;
      console.log(this.c('blue', `   ${icons.sparkles} View on Solscan: ${solscanUrl}`));
    }

    console.log(this.c('cyan', `${icons.chart} New shielded balance: ${this.c('bright', formattedBalance)}`));
  }

  private formatBalance(amount: bigint, token: 'SOL' | 'USDC'): string {
    if (token === 'SOL') {
      const sol = Number(amount) / LAMPORTS_PER_SOL;
      return `${sol.toFixed(4)} SOL`;
    } else {
      const usdc = Number(amount) / Math.pow(10, USDC_DECIMALS);
      return `${usdc.toFixed(2)} USDC`;
    }
  }

  // ============================================
  // ZK Proof Simulation
  // ============================================

  private async simulateZKProof(operation: string): Promise<void> {
    if (!this.mockConfig.simulateProofDelay) return;

    const totalDelay = this.mockConfig.simulateProofDelay;
    const steps = [
      { msg: 'Generating witness...', pct: 0 },
      { msg: 'Building circuit...', pct: 25 },
      { msg: 'Computing proof...', pct: 50 },
      { msg: 'Verifying locally...', pct: 75 },
      { msg: 'Proof ready!', pct: 100 },
    ];

    if (this.mockConfig.logOperations && this.mockConfig.showProgress) {
      console.log();
      console.log(this.c('yellow', `${icons.hourglass} Generating ZK proof for ${operation}...`));

      const stepDelay = totalDelay / (steps.length - 1);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const bar = this.progressBar(step.pct);
        process.stdout.write(`\r   ${this.c('dim', bar)} ${this.c('cyan', step.msg)}`);

        if (i < steps.length - 1) {
          await new Promise((r) => setTimeout(r, stepDelay));
        }
      }

      console.log();
      console.log(this.c('green', `${icons.sparkles} ZK proof generated successfully!`));
    } else {
      // Silent delay
      await new Promise((r) => setTimeout(r, totalDelay));
    }
  }

  private progressBar(percent: number): string {
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    const filledChar = this.mockConfig.colorfulOutput ? this.c('green', '\u2588') : '#';
    const emptyChar = this.mockConfig.colorfulOutput ? this.c('dim', '\u2591') : '-';
    return `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}] ${percent}%`;
  }

  // ============================================
  // Balance Management
  // ============================================

  private getMockBalance(): { SOL: bigint; USDC: bigint } {
    return mockBalances.get(this.walletKey) || { SOL: BigInt(0), USDC: BigInt(0) };
  }

  private setMockBalance(token: 'SOL' | 'USDC', amount: bigint): void {
    const balance = this.getMockBalance();
    balance[token] = amount;
    mockBalances.set(this.walletKey, balance);
    // Persist to file for cross-process state
    saveBalancesToFile(mockBalances);
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
    this.logOperation('deposit', 'SOL', amount);

    // Simulate ZK proof generation
    await this.simulateZKProof('deposit SOL');

    let signature: string;

    if (this.mockConfig.useRealTransfers) {
      // Send real SOL transaction on devnet (viewable on Solscan)
      try {
        this.log(this.c('dim', 'Sending real devnet transaction...'));
        const memo = `${this.mockConfig.memoPrefix}:SHIELD:${amount}SOL`;
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.walletPublicKey,
            toPubkey: this.walletPublicKey, // Send to self
            lamports: Number(lamports),
          }),
          // Add memo so tx is clearly labeled as mock on Solscan
          new TransactionInstruction({
            keys: [],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(memo),
          })
        );
        signature = await sendAndConfirmTransaction(this.connection, tx, [this.config.wallet]);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        callbacks?.onError?.(err);
        throw new TransactionError(err.message);
      }
    } else {
      // Generate mock signature (looks realistic)
      signature = this.generateMockSignature('shield');
    }

    // Update mock balance
    const currentBalance = this.getMockBalance();
    this.setMockBalance('SOL', currentBalance.SOL + lamports);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.logSuccess('deposit', 'SOL', amount, signature, this.mockConfig.useRealTransfers);

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
    this.logOperation('deposit', 'USDC', amount);

    // Simulate ZK proof generation
    await this.simulateZKProof('deposit USDC');

    let signature: string;
    let usedRealTx = false;

    if (this.mockConfig.useRealTransfers) {
      // Try to send real USDC on devnet (Circle's USDC mint)
      // Faucet: https://faucet.circle.com/ (20 USDC per 2 hours)
      try {
        this.log(this.c('dim', 'Attempting real USDC devnet transaction...'));

        const sourceAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, this.walletPublicKey);

        // Check if we have USDC balance
        let hasBalance = false;
        try {
          const tokenAccount = await getAccount(this.connection, sourceAta);
          hasBalance = tokenAccount.amount >= baseUnits;
          if (!hasBalance) {
            this.log(this.c('yellow', `${icons.warning} Insufficient USDC (have ${tokenAccount.amount}, need ${baseUnits})`));
            this.log(this.c('dim', '   Get devnet USDC: https://faucet.circle.com/'));
          }
        } catch (e) {
          if (e instanceof TokenAccountNotFoundError) {
            this.log(this.c('yellow', `${icons.warning} No USDC token account found`));
            this.log(this.c('dim', '   Get devnet USDC: https://faucet.circle.com/'));
          }
        }

        if (hasBalance) {
          // Send USDC to self (simulates shielding)
          const memo = `${this.mockConfig.memoPrefix}:SHIELD:${amount}USDC`;
          const tx = new Transaction().add(
            createTransferInstruction(
              sourceAta,
              sourceAta, // Send to self
              this.walletPublicKey,
              baseUnits
            ),
            new TransactionInstruction({
              keys: [],
              programId: MEMO_PROGRAM_ID,
              data: Buffer.from(memo),
            })
          );
          signature = await sendAndConfirmTransaction(this.connection, tx, [this.config.wallet]);
          usedRealTx = true;
        } else {
          // Fall back to mock signature
          this.log(this.c('dim', 'Falling back to mock signature...'));
          signature = this.generateMockSignature('shield');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.log(this.c('yellow', `${icons.warning} Real USDC tx failed: ${err.message}`));
        this.log(this.c('dim', 'Falling back to mock signature...'));
        signature = this.generateMockSignature('shield');
      }
    } else {
      signature = this.generateMockSignature('shield');
    }

    // Update mock balance
    const currentBalance = this.getMockBalance();
    this.setMockBalance('USDC', currentBalance.USDC + baseUnits);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.logSuccess('deposit', 'USDC', amount, signature, usedRealTx);

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
    this.logOperation('withdraw', 'SOL', amount);
    this.log(this.c('dim', `   Destination: ${destAddress.toBase58().slice(0, 8)}...${destAddress.toBase58().slice(-4)}`));

    // Simulate ZK proof generation
    await this.simulateZKProof('withdraw SOL');

    let signature: string;
    const fee = BigInt(5000); // 0.000005 SOL mock fee

    if (this.mockConfig.useRealTransfers) {
      // Send real SOL transaction on devnet (viewable on Solscan)
      try {
        this.log(this.c('dim', 'Sending real devnet transaction...'));
        const memo = `${this.mockConfig.memoPrefix}:UNSHIELD:${amount}SOL:${destAddress.toBase58().slice(0, 8)}...`;
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.walletPublicKey,
            toPubkey: destAddress, // Send to actual destination
            lamports: Number(lamports - fee),
          }),
          // Add memo so tx is clearly labeled as mock on Solscan
          new TransactionInstruction({
            keys: [],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(memo),
          })
        );
        signature = await sendAndConfirmTransaction(this.connection, tx, [this.config.wallet]);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        callbacks?.onError?.(err);
        throw new TransactionError(err.message);
      }
    } else {
      signature = this.generateMockSignature('unshield');
    }

    // Update mock balance
    this.setMockBalance('SOL', currentBalance.SOL - lamports);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.logSuccess('withdraw', 'SOL', amount, signature, this.mockConfig.useRealTransfers);
    this.log(this.c('dim', `   Fee: ${Number(fee) / LAMPORTS_PER_SOL} SOL`));

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
    this.logOperation('withdraw', 'USDC', amount);
    this.log(this.c('dim', `   Destination: ${destAddress.toBase58().slice(0, 8)}...${destAddress.toBase58().slice(-4)}`));

    // Simulate ZK proof generation
    await this.simulateZKProof('withdraw USDC');

    let signature: string;
    let usedRealTx = false;
    const fee = BigInt(1000); // Mock fee in base units (0.001 USDC)

    if (this.mockConfig.useRealTransfers) {
      // Try to send real USDC on devnet
      try {
        this.log(this.c('dim', 'Attempting real USDC devnet transaction...'));

        const sourceAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, this.walletPublicKey);
        const destAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, destAddress);

        // Check source balance
        let hasBalance = false;
        try {
          const tokenAccount = await getAccount(this.connection, sourceAta);
          hasBalance = tokenAccount.amount >= baseUnits;
        } catch (e) {
          // No token account
        }

        if (hasBalance) {
          const memo = `${this.mockConfig.memoPrefix}:UNSHIELD:${amount}USDC:${destAddress.toBase58().slice(0, 8)}...`;
          const tx = new Transaction();

          // Check if destination ATA exists, create if not
          try {
            await getAccount(this.connection, destAta);
          } catch (e) {
            if (e instanceof TokenAccountNotFoundError) {
              tx.add(
                createAssociatedTokenAccountInstruction(
                  this.walletPublicKey, // payer
                  destAta,
                  destAddress,
                  USDC_DEVNET_MINT
                )
              );
            }
          }

          tx.add(
            createTransferInstruction(
              sourceAta,
              destAta,
              this.walletPublicKey,
              baseUnits - fee
            ),
            new TransactionInstruction({
              keys: [],
              programId: MEMO_PROGRAM_ID,
              data: Buffer.from(memo),
            })
          );

          signature = await sendAndConfirmTransaction(this.connection, tx, [this.config.wallet]);
          usedRealTx = true;
        } else {
          this.log(this.c('dim', 'Insufficient USDC, falling back to mock signature...'));
          signature = this.generateMockSignature('unshield');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.log(this.c('yellow', `${icons.warning} Real USDC tx failed: ${err.message}`));
        this.log(this.c('dim', 'Falling back to mock signature...'));
        signature = this.generateMockSignature('unshield');
      }
    } else {
      signature = this.generateMockSignature('unshield');
    }

    // Update mock balance
    this.setMockBalance('USDC', currentBalance.USDC - baseUnits);

    callbacks?.onSent?.(signature);
    callbacks?.onConfirmed?.(signature);

    this.logSuccess('withdraw', 'USDC', amount, signature, usedRealTx);
    this.log(this.c('dim', `   Fee: ${Number(fee) / Math.pow(10, USDC_DECIMALS)} USDC`));

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
    const formatted = this.formatBalance(amount, token);

    if (this.mockConfig.logOperations) {
      console.log();
      console.log(this.c('cyan', `${icons.chart} Shielded ${token} Balance: ${this.c('bright', formatted)}`));
    }

    return {
      token,
      amount,
      protocol: 'privacy-cash',
    };
  }

  async clearCache(): Promise<void> {
    this.log(`${icons.gear} Clearing cache (no-op in mock)`);
  }

  // ============================================
  // Mock-specific Methods
  // ============================================

  /**
   * Generate a realistic-looking mock signature
   */
  private generateMockSignature(type: 'shield' | 'unshield'): string {
    // Generate a base58-like signature that looks realistic
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let sig = '';
    for (let i = 0; i < 87; i++) {
      sig += chars[Math.floor(Math.random() * chars.length)];
    }
    // Prepend type indicator for debugging (still looks like base58)
    return `${type === 'shield' ? '5' : '4'}${sig}`;
  }

  /**
   * Set mock balance directly (for testing)
   */
  setBalance(token: 'SOL' | 'USDC', amount: bigint): void {
    this.setMockBalance(token, amount);
    const formatted = this.formatBalance(amount, token);
    this.log(`${icons.money} Set ${token} balance to ${formatted}`);
  }

  /**
   * Reset all mock balances
   */
  resetBalances(): void {
    mockBalances.set(this.walletKey, { SOL: BigInt(0), USDC: BigInt(0) });
    this.log(`${icons.gear} Reset all balances to 0`);
  }

  /**
   * Get all balances (formatted for display)
   */
  getAllBalances(): { SOL: string; USDC: string; raw: { SOL: bigint; USDC: bigint } } {
    const balance = this.getMockBalance();
    return {
      SOL: this.formatBalance(balance.SOL, 'SOL'),
      USDC: this.formatBalance(balance.USDC, 'USDC'),
      raw: balance,
    };
  }

  /**
   * Get real USDC balance on devnet (Circle's USDC)
   * Use https://faucet.circle.com/ to get test USDC
   */
  async getRealUSDCBalance(): Promise<{ amount: bigint; formatted: string; hasAccount: boolean }> {
    try {
      const ata = await getAssociatedTokenAddress(USDC_DEVNET_MINT, this.walletPublicKey);
      const tokenAccount = await getAccount(this.connection, ata);
      const formatted = `${Number(tokenAccount.amount) / Math.pow(10, USDC_DECIMALS)} USDC`;

      if (this.mockConfig.logOperations) {
        console.log(this.c('cyan', `${icons.money} Real devnet USDC: ${this.c('bright', formatted)}`));
      }

      return {
        amount: tokenAccount.amount,
        formatted,
        hasAccount: true,
      };
    } catch (e) {
      if (this.mockConfig.logOperations) {
        console.log(this.c('yellow', `${icons.warning} No USDC account found`));
        console.log(this.c('dim', '   Get devnet USDC: https://faucet.circle.com/'));
      }
      return {
        amount: BigInt(0),
        formatted: '0 USDC',
        hasAccount: false,
      };
    }
  }

  /**
   * Get the USDC devnet mint address (Circle's official)
   */
  static getUSDCMint(): PublicKey {
    return USDC_DEVNET_MINT;
  }

  /**
   * Print a summary of current balances (for demo)
   */
  printBalanceSummary(): void {
    if (!this.mockConfig.logOperations) return;

    const balances = this.getAllBalances();
    console.log();
    console.log(this.c('cyan', '╔════════════════════════════════════╗'));
    console.log(this.c('cyan', '║') + this.c('bright', `  ${icons.shield} Shielded Balance Summary`) + '     ' + this.c('cyan', '║'));
    console.log(this.c('cyan', '╠════════════════════════════════════╣'));
    console.log(this.c('cyan', '║') + `  SOL:  ${this.c('green', balances.SOL.padEnd(20))}` + this.c('cyan', '║'));
    console.log(this.c('cyan', '║') + `  USDC: ${this.c('green', balances.USDC.padEnd(20))}` + this.c('cyan', '║'));
    console.log(this.c('cyan', '╚════════════════════════════════════╝'));
    console.log();
  }

  /**
   * Check if this is a mock implementation
   */
  static isMock(): boolean {
    return true;
  }

  /**
   * Get mock instance info (for debugging)
   */
  getMockInfo(): {
    isMock: boolean;
    walletAddress: string;
    operationCount: number;
    config: MockPrivacyCashConfig;
  } {
    return {
      isMock: true,
      walletAddress: this.walletKey,
      operationCount: this.operationCount,
      config: this.mockConfig,
    };
  }
}
