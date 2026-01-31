import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getSpykClient, isMockMode } from '../config/spyk-client.js';
import type { Tool } from './index.js';
import type { BalanceResult as SDKBalanceResult } from '../../../dist/index.mjs';

/** USDC mint address on Solana (mainnet/devnet use same address) */
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/** USDC decimals */
const USDC_DECIMALS = 6;

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
      // Get the shared Spyk SDK client
      const spyk = getSpykClient();
      const connection = spyk.rpcConnection;
      const walletPublicKey = spyk.walletPublicKey;

      // Get public balance based on token type
      let publicAmount: number;

      if (token === 'SOL') {
        const publicBalance = await connection.getBalance(walletPublicKey);
        publicAmount = publicBalance / LAMPORTS_PER_SOL;
      } else {
        // USDC
        publicAmount = await getUsdcBalance(walletPublicKey);
      }

      // Get shielded balance
      let shieldedAmount: number;

      if (isMockMode()) {
        // Mock mode - return placeholder values
        shieldedAmount = 0;
      } else {
        // Real mode - query via Spyk SDK
        try {
          const balanceResult = await spyk.getBalance(token) as SDKBalanceResult;

          if (token === 'SOL') {
            // Convert lamports to SOL
            shieldedAmount = Number(balanceResult.amount) / LAMPORTS_PER_SOL;
          } else {
            // Convert base units to USDC
            shieldedAmount = Number(balanceResult.amount) / Math.pow(10, USDC_DECIMALS);
          }
        } catch (balanceError) {
          // If SDK balance query fails (e.g., no account exists), return 0
          console.error('[SPYK MCP] Balance query failed:', balanceError);
          shieldedAmount = 0;
        }
      }

      return {
        shielded: `${shieldedAmount.toFixed(4)} ${token}`,
        public: `${publicAmount.toFixed(4)} ${token}`,
        token,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get balance: ${message}`);
    }
  },
};

/**
 * Get USDC token account balance for a wallet
 */
async function getUsdcBalance(owner: PublicKey): Promise<number> {
  try {
    const spyk = getSpykClient();
    const connection = spyk.rpcConnection;

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      mint: USDC_MINT,
    });

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    // Sum up all USDC token accounts (usually just one)
    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed?.info;
      if (parsedInfo?.tokenAmount?.uiAmount) {
        totalBalance += parsedInfo.tokenAmount.uiAmount;
      }
    }

    return totalBalance;
  } catch {
    return 0;
  }
}
