import type { X402Invoice, X402Facilitator } from './types';

export interface MockFacilitatorConfig {
  logPayments?: boolean;
  simulateDelay?: number; // ms
}

/**
 * Mock X402 Facilitator for offline/devnet-unavailable scenarios.
 *
 * This provides a fallback when the x402 devnet facilitator is down,
 * ensuring the demo can still function.
 */
export class MockX402Facilitator implements X402Facilitator {
  constructor(private config: MockFacilitatorConfig = { logPayments: true }) {}

  /**
   * Create a mock payment proof
   *
   * The proof format is: mock_<timestamp>_<amount>_<recipient-prefix>
   * This makes it clearly distinguishable from real proofs.
   */
  async createPaymentProof(invoice: X402Invoice): Promise<string> {
    if (this.config.simulateDelay) {
      await new Promise((r) => setTimeout(r, this.config.simulateDelay));
    }

    // Generate a mock proof that looks real but is identifiable
    const mockProof = `mock_${Date.now()}_${invoice.amount}_${invoice.recipient.slice(0, 8)}`;

    if (this.config.logPayments) {
      console.log('[MOCK X402] Payment proof created:', {
        amount: invoice.amount,
        token: invoice.token,
        recipient: invoice.recipient,
        proof: mockProof,
      });
    }

    return mockProof;
  }

  /**
   * Verify a payment proof
   *
   * Mock accepts:
   * - Any proof starting with 'mock_'
   * - Any proof if SPYK_ACCEPT_ALL_PROOFS=true
   */
  async verifyPayment(proof: string): Promise<{ valid: boolean; details?: unknown }> {
    const acceptAll = process.env.SPYK_ACCEPT_ALL_PROOFS === 'true';
    const isValid = proof.startsWith('mock_') || acceptAll;

    if (this.config.logPayments) {
      console.log('[MOCK X402] Payment verification:', {
        proof: proof.substring(0, 30) + (proof.length > 30 ? '...' : ''),
        valid: isValid,
        mode: acceptAll ? 'accept-all' : 'mock-only',
      });
    }

    return {
      valid: isValid,
      details: isValid
        ? {
            mock: true,
            timestamp: Date.now(),
            proof,
          }
        : undefined,
    };
  }

  /**
   * Check if a proof is a mock proof
   */
  static isMockProof(proof: string): boolean {
    return proof.startsWith('mock_');
  }

  /**
   * Parse details from a mock proof
   */
  static parseMockProof(proof: string): { timestamp: number; amount: string; recipientPrefix: string } | null {
    if (!MockX402Facilitator.isMockProof(proof)) return null;

    const parts = proof.split('_');
    if (parts.length < 4) return null;

    return {
      timestamp: parseInt(parts[1], 10),
      amount: parts[2],
      recipientPrefix: parts[3],
    };
  }
}
