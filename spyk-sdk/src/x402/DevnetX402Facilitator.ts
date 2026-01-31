import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import type { X402Invoice, X402Facilitator } from './types';

export interface DevnetFacilitatorConfig {
  connection: Connection;
  /** Funding keypair - pays for the actual transfer */
  fundingKeypair: Keypair;
  logPayments?: boolean;
}

export interface DevnetPaymentDetails {
  ephemeralAddress: string;
  fundingSignature: string;
  paymentSignature: string;
  solscanUrl: string;
}

/**
 * Real Devnet X402 Facilitator
 *
 * This facilitator creates REAL transactions on Solana devnet.
 * Use for demos that need to show actual Solscan transactions.
 *
 * Flow:
 * 1. Generate ephemeral keypair
 * 2. Fund ephemeral from funding keypair
 * 3. Send actual SOL transfer from ephemeral to invoice recipient
 * 4. Return real transaction signature
 *
 * Privacy Model:
 * - Funding keypair IS your wallet (not private)
 * - Ephemeral keypair breaks the direct link
 * - For full privacy, use with Privacy Cash withdrawal
 *
 * @example
 * ```typescript
 * const facilitator = new DevnetX402Facilitator({
 *   connection,
 *   fundingKeypair: wallet,
 *   logPayments: true,
 * });
 *
 * const signature = await facilitator.createPaymentProof(invoice);
 * // signature is a REAL tx visible on Solscan
 * ```
 */
export class DevnetX402Facilitator implements X402Facilitator {
  private connection: Connection;
  private fundingKeypair: Keypair;
  private logPayments: boolean;

  /** Store last payment details for inspection */
  public lastPaymentDetails: DevnetPaymentDetails | null = null;

  constructor(config: DevnetFacilitatorConfig) {
    this.connection = config.connection;
    this.fundingKeypair = config.fundingKeypair;
    this.logPayments = config.logPayments ?? true;
  }

  /**
   * Create a real payment on devnet
   *
   * @param invoice - The x402 invoice to pay
   * @returns Transaction signature (viewable on Solscan)
   */
  async createPaymentProof(invoice: X402Invoice): Promise<string> {
    const amount = parseFloat(invoice.amount);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(invoice.recipient);
    } catch {
      throw new Error(`Invalid recipient address: ${invoice.recipient}`);
    }

    // 1. Generate ephemeral keypair
    const ephemeral = Keypair.generate();
    const ephemeralAddress = ephemeral.publicKey.toBase58();

    if (this.logPayments) {
      console.log('[DEVNET X402] Ephemeral address:', ephemeralAddress);
    }

    // 2. Check funding balance
    const fundingBalance = await this.connection.getBalance(this.fundingKeypair.publicKey);
    const rentExemptMin = 890880; // Rent-exempt minimum for ephemeral account
    const requiredFunding = lamports + 15000 + rentExemptMin; // Payment + fees + rent

    if (fundingBalance < requiredFunding) {
      throw new Error(
        `Insufficient funding balance. Need ${requiredFunding / LAMPORTS_PER_SOL} SOL, ` +
        `have ${fundingBalance / LAMPORTS_PER_SOL} SOL. ` +
        `Get devnet SOL from https://faucet.solana.com/`
      );
    }

    // 3. Fund ephemeral from funding wallet
    // Need: payment amount + tx fee + rent-exempt minimum (~0.00089 SOL = 890880 lamports)
    const rentExemptMinimum = 890880; // Minimum for account to exist
    const fundAmount = lamports + 10000 + rentExemptMinimum; // Payment + fee + rent

    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.fundingKeypair.publicKey,
        toPubkey: ephemeral.publicKey,
        lamports: fundAmount,
      })
    );

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    fundTx.recentBlockhash = blockhash;
    fundTx.feePayer = this.fundingKeypair.publicKey;

    const fundSig = await sendAndConfirmTransaction(
      this.connection,
      fundTx,
      [this.fundingKeypair],
      { commitment: 'confirmed' }
    );

    if (this.logPayments) {
      console.log('[DEVNET X402] Funded ephemeral:', fundSig);
    }

    // 4. Send actual payment from ephemeral to recipient
    const paymentTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: ephemeral.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    // Add memo if provided
    if (invoice.memo) {
      // Note: For simplicity, we're not adding memo program here
      // In production, you'd import @solana/spl-memo
    }

    const { blockhash: paymentBlockhash } = await this.connection.getLatestBlockhash('confirmed');
    paymentTx.recentBlockhash = paymentBlockhash;
    paymentTx.feePayer = ephemeral.publicKey;

    const paymentSig = await sendAndConfirmTransaction(
      this.connection,
      paymentTx,
      [ephemeral],
      { commitment: 'confirmed' }
    );

    // Determine network for Solscan URL
    const network = invoice.network || 'devnet';
    const clusterParam = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    const solscanUrl = `https://solscan.io/tx/${paymentSig}${clusterParam}`;

    if (this.logPayments) {
      console.log('[DEVNET X402] Payment sent:', paymentSig);
      console.log('[DEVNET X402] View on Solscan:', solscanUrl);
    }

    // Store details for inspection
    this.lastPaymentDetails = {
      ephemeralAddress,
      fundingSignature: fundSig,
      paymentSignature: paymentSig,
      solscanUrl,
    };

    return paymentSig;
  }

  /**
   * Verify a payment proof by checking the transaction on-chain
   *
   * @param proof - Transaction signature to verify
   * @returns Verification result with on-chain details
   */
  async verifyPayment(proof: string): Promise<{ valid: boolean; details?: unknown }> {
    try {
      // Verify the transaction exists on-chain
      const tx = await this.connection.getTransaction(proof, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return { valid: false };
      }

      return {
        valid: tx.meta?.err === null,
        details: {
          slot: tx.slot,
          blockTime: tx.blockTime,
          fee: tx.meta?.fee,
          success: tx.meta?.err === null,
        },
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Get the last payment details
   * Useful for displaying to users after payment
   */
  getLastPaymentDetails(): DevnetPaymentDetails | null {
    return this.lastPaymentDetails;
  }

  /**
   * Check if the funding keypair has sufficient balance for a payment
   *
   * @param amount - Amount in SOL
   * @returns Balance check result
   */
  async checkFundingBalance(amount: number): Promise<{
    sufficient: boolean;
    balance: number;
    required: number;
  }> {
    const balance = await this.connection.getBalance(this.fundingKeypair.publicKey);
    const rentExemptMin = 890880;
    const required = Math.floor(amount * LAMPORTS_PER_SOL) + 15000 + rentExemptMin;

    return {
      sufficient: balance >= required,
      balance: balance / LAMPORTS_PER_SOL,
      required: required / LAMPORTS_PER_SOL,
    };
  }
}
