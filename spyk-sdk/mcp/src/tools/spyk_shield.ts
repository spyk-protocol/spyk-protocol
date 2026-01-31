import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PrivacyCash } from 'privacycash';
import { loadWalletConfig } from '../config/wallet.js';
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

/** USDC decimals on Solana */
const USDC_DECIMALS = 6;

/** Minimum SOL to keep for rent/fees */
const MIN_SOL_RESERVE = 0.01 * LAMPORTS_PER_SOL;

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
    const useMock = process.env.SPYK_USE_MOCK_FACILITATOR === 'true';

    if (useMock) {
      // Mock mode for testing without real transactions
      return {
        success: true,
        signature: `mock_shield_${Date.now()}`,
        amount: `${amount} ${token}`,
        token,
        message: `[MOCK] Would shield ${amount} ${token}. Set SPYK_USE_MOCK_FACILITATOR=false for real transactions.`,
      };
    }

    try {
      const config = loadWalletConfig();
      const rpcUrl = process.env.SPYK_RPC_URL || config.connection.rpcEndpoint;

      // Initialize Privacy Cash client
      const privacyCashClient = new PrivacyCash({
        RPC_url: rpcUrl,
        owner: config.keypair,
        enableDebug: false,
      });

      if (token === 'SOL') {
        // Check balance before shielding
        const balance = await config.connection.getBalance(config.keypair.publicKey);
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        const requiredBalance = lamports + MIN_SOL_RESERVE;

        if (balance < requiredBalance) {
          const availableSol = (balance / LAMPORTS_PER_SOL).toFixed(4);
          const neededSol = (requiredBalance / LAMPORTS_PER_SOL).toFixed(4);
          throw new Error(
            `Insufficient balance: have ${availableSol} SOL, need ${neededSol} SOL (including ${MIN_SOL_RESERVE / LAMPORTS_PER_SOL} SOL reserve for fees)`
          );
        }

        // Execute real shield transaction
        const result = await privacyCashClient.deposit({ lamports });

        return {
          success: true,
          signature: result.tx,
          amount: `${amount} ${token}`,
          token,
          message: `Successfully shielded ${amount} SOL. Transaction: ${result.tx}`,
        };
      } else if (token === 'USDC') {
        // USDC shielding
        const baseUnits = Math.floor(amount * Math.pow(10, USDC_DECIMALS));
        const result = await privacyCashClient.depositUSDC({ base_units: baseUnits });

        return {
          success: true,
          signature: result.tx,
          amount: `${amount} ${token}`,
          token,
          message: `Successfully shielded ${amount} USDC. Transaction: ${result.tx}`,
        };
      } else {
        throw new Error(`Unsupported token: ${token}. Only SOL and USDC are supported.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to shield funds: ${message}`);
    }
  },
};
