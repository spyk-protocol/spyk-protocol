import { getSpykClient, isMockMode } from '../config/spyk-client.js';
import type { Tool } from './index.js';

interface ShieldInput {
  amount: number;
  token?: 'SOL' | 'USDC';
}

interface ShieldResult {
  success: boolean;
  signature?: string;
  amount: string;
  token: string;
  message: string;
}

/**
 * spyk_shield - Shield funds for private payments
 *
 * Moves funds from your public wallet into the shielded pool,
 * making them available for private x402 payments.
 */
export const spyk_shield: Tool = {
  name: 'spyk_shield',
  description: 'Shield (deposit) funds into the private pool for x402 payments. Makes your funds available for privacy-preserving payments.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Amount to shield in SOL or USDC',
      },
      token: {
        type: 'string',
        enum: ['SOL', 'USDC'],
        description: 'Token to shield. Defaults to SOL.',
      },
    },
    required: ['amount'],
  },
  async handler(args: Record<string, unknown>): Promise<ShieldResult> {
    const input = args as unknown as ShieldInput;
    const token = input.token || 'SOL';
    const amount = input.amount;

    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Check if mock mode is enabled
    if (isMockMode()) {
      return {
        success: true,
        signature: `mock_shield_${Date.now()}`,
        amount: `${amount} ${token}`,
        token,
        message: `[MOCK] Would shield ${amount} ${token}. Set SPYK_USE_MOCK_FACILITATOR=false for real transactions.`,
      };
    }

    try {
      // Get shared Spyk SDK client
      const spyk = getSpykClient();

      // Execute shield via SDK
      const result = await spyk.deposit(token, amount);

      return {
        success: result.status === 'confirmed',
        signature: result.signature,
        amount: `${amount} ${token}`,
        token,
        message: `Successfully shielded ${amount} ${token}. Transaction: ${result.signature}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to shield funds: ${message}`);
    }
  },
};
