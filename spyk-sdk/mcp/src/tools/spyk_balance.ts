import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadWalletConfig } from '../config/wallet.js';
import type { Tool } from './index.js';

interface BalanceInput {
  token?: 'SOL' | 'USDC';
}

interface BalanceResult {
  shielded: string;
  public: string;
  token: string;
}

/**
 * spyk_balance - Check shielded and public balance
 *
 * Returns both the shielded (private) balance available for x402 payments
 * and the public (on-chain) balance of the configured wallet.
 */
export const spyk_balance: Tool = {
  name: 'spyk_balance',
  description: 'Check shielded (private) and public balance. Shielded balance is available for private x402 payments.',
  inputSchema: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        enum: ['SOL', 'USDC'],
        description: 'Token to check balance for. Defaults to SOL.',
      },
    },
  },
  async handler(args: Record<string, unknown>): Promise<BalanceResult> {
    const input = args as BalanceInput;
    const token = input.token || 'SOL';

    try {
      const config = loadWalletConfig();

      // Get public balance
      const publicBalance = await config.connection.getBalance(config.keypair.publicKey);
      const publicSol = publicBalance / LAMPORTS_PER_SOL;

      // For shielded balance, we would need to integrate with SpykPrivacyCash
      // For now, return a placeholder indicating it needs the full SDK
      // TODO: Initialize SpykPrivacyCash and query real shielded balance
      const shieldedSol = 0; // Placeholder

      return {
        shielded: `${shieldedSol.toFixed(4)} ${token}`,
        public: `${publicSol.toFixed(4)} ${token}`,
        token,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get balance: ${message}`);
    }
  },
};
