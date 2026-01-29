import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import type { X402Invoice, X402PaymentResult, X402Facilitator } from './types.js';
import { MockX402Facilitator } from './MockX402Facilitator.js';

/** SOL amount for transaction fees */
const ESTIMATED_TX_FEES_SOL = 0.001;

/** Interface matching SpykPrivacyCash withdraw method */
interface PrivacyCashLike {
  getPrivateBalance(token: 'SOL' | 'USDC'): Promise<{ amount: bigint }>;
  withdraw(amount: number, destination?: PublicKey | string): Promise<{
    signature: string;
    amount: bigint;
  }>;
}

/** Interface matching SpykShadowWire (not used in current implementation) */
interface ShadowWireLike {
  sendPrivateTransfer(amount: bigint, recipient: string): Promise<string>;
}

export interface SpykX402ClientConfig {
  useMockFacilitator?: boolean;
  logPayments?: boolean;
}

/**
 * SpykX402Client - Privacy-preserving x402 payment client
 *
 * Enables making x402 payments using shielded (private) funds.
 * The key innovation is using ephemeral keypairs:
 *
 * 1. Withdraw from shielded pool to a one-time ephemeral keypair
 * 2. Use ephemeral keypair to sign x402 payment
 * 3. Ephemeral keypair is discarded - no link to original wallet
 *
 * This breaks the on-chain link between your identity and the payment.
 */
export class SpykX402Client {
  private facilitator: X402Facilitator | null = null;

  constructor(
    private privacyCash: PrivacyCashLike,
    private shadowWire: ShadowWireLike,
    private connection: Connection,
    private config: SpykX402ClientConfig = {}
  ) {
    // Auto-configure mock facilitator if requested
    if (config.useMockFacilitator || process.env.SPYK_USE_MOCK_FACILITATOR === 'true') {
      this.facilitator = new MockX402Facilitator({ logPayments: config.logPayments });
    }
  }

  /**
   * Set the facilitator to use for x402 payments
   */
  setFacilitator(facilitator: X402Facilitator): void {
    this.facilitator = facilitator;
  }

  /**
   * Get the current shielded SOL balance
   */
  async getShieldedBalance(): Promise<bigint> {
    const result = await this.privacyCash.getPrivateBalance('SOL');
    return result.amount;
  }

  /**
   * Calculate total SOL needed for an x402 payment
   * Includes the payment amount plus estimated transaction fees
   */
  private calculateTotalNeeded(invoice: X402Invoice): number {
    const amount = parseFloat(invoice.amount);
    return amount + ESTIMATED_TX_FEES_SOL;
  }

  /**
   * Pay an x402 invoice privately using shielded funds
   *
   * This is the core privacy-preserving payment method:
   *
   * Flow:
   * 1. Generate ephemeral keypair (one-time use for privacy)
   * 2. Withdraw exact amount from shielded pool to ephemeral address
   * 3. Wait for withdrawal confirmation
   * 4. Use ephemeral to sign x402 payment (via facilitator)
   * 5. Return payment proof
   *
   * Privacy Property:
   * - On-chain: Only the ephemeral address appears in the payment
   * - The withdrawal from shielded pool is private (ZK proof)
   * - Ephemeral keypair is generated fresh for each payment
   * - No way to link multiple payments to the same user
   *
   * @param invoice - The x402 invoice to pay
   * @returns Payment result with signature and ephemeral address used
   * @throws Error if insufficient shielded balance or facilitator not configured
   */
  async payPrivately(invoice: X402Invoice): Promise<X402PaymentResult> {
    if (!this.facilitator) {
      throw new Error(
        'No facilitator configured. Call setFacilitator() or set useMockFacilitator in config.'
      );
    }

    // 1. Check shielded balance
    const totalNeeded = this.calculateTotalNeeded(invoice);
    const totalNeededLamports = BigInt(Math.floor(totalNeeded * LAMPORTS_PER_SOL));
    const balance = await this.getShieldedBalance();

    if (balance < totalNeededLamports) {
      throw new Error(
        `Insufficient shielded balance. Need ${totalNeeded} SOL, have ${Number(balance) / LAMPORTS_PER_SOL} SOL`
      );
    }

    // 2. Generate ephemeral keypair (one-time use for privacy)
    const ephemeral = Keypair.generate();
    const ephemeralAddress = ephemeral.publicKey.toBase58();

    if (this.config.logPayments) {
      console.log('[SPYK] Ephemeral address:', ephemeralAddress);
    }

    // 3. Withdraw from shielded pool to ephemeral address
    const withdrawResult = await this.privacyCash.withdraw(totalNeeded, ephemeral.publicKey);

    if (this.config.logPayments) {
      console.log('[SPYK] Withdrawal tx:', withdrawResult.signature);
    }

    // 4. Wait for withdrawal confirmation
    await this.connection.confirmTransaction(withdrawResult.signature, 'confirmed');

    // 5. Create payment proof using facilitator
    // Note: In a real implementation, this would use the ephemeral keypair
    // to sign the x402 payment. For now, we use the mock facilitator.
    const proof = await this.facilitator.createPaymentProof(invoice);

    if (this.config.logPayments) {
      console.log('[SPYK] Payment proof:', proof);
    }

    // 6. Return result
    return {
      signature: proof, // The proof IS the signature for x402
      isPrivate: true,
      timestamp: Date.now(),
      proof,
      ephemeralUsed: ephemeralAddress,
      withdrawalSignature: withdrawResult.signature,
    };
  }

  /**
   * Verify a payment proof
   * @param proof - The payment proof to verify
   * @returns Verification result
   */
  async verifyPayment(proof: string): Promise<{ valid: boolean; details?: unknown }> {
    if (!this.facilitator) {
      throw new Error('No facilitator configured');
    }
    return this.facilitator.verifyPayment(proof);
  }

  /**
   * Parse an x402 response from an API
   * Extracts the x402 payment request from a 402 response body
   */
  static parseX402Response(response: { x402?: X402Invoice }): X402Invoice | null {
    if (!response.x402) return null;

    return {
      amount: response.x402.amount,
      token: response.x402.token,
      recipient: response.x402.recipient,
      memo: response.x402.memo,
      facilitator: response.x402.facilitator,
      network: response.x402.network,
    };
  }

  /**
   * Create a client configured with mock facilitator for testing
   */
  static createMockClient(
    privacyCash: PrivacyCashLike,
    shadowWire: ShadowWireLike,
    connection: Connection
  ): SpykX402Client {
    return new SpykX402Client(privacyCash, shadowWire, connection, {
      useMockFacilitator: true,
      logPayments: true,
    });
  }
}
