import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { PrivacyCash } from 'privacycash';
import { loadWalletConfig } from '../config/wallet.js';
import type { Tool } from './index.js';

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
 * Get USDC token account balance for a wallet
 */
async function getUsdcBalance(connection: Connection, owner: PublicKey): Promise<number> {
  try {
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
    const useMock = process.env.SPYK_USE_MOCK_FACILITATOR === 'true';

    try {
      const config = loadWalletConfig();

      // Get public balance based on token type
      let publicAmount: number;

      if (token === 'SOL') {
        const publicBalance = await config.connection.getBalance(config.keypair.publicKey);
        publicAmount = publicBalance / LAMPORTS_PER_SOL;
      } else {
        // USDC
        publicAmount = await getUsdcBalance(config.connection, config.keypair.publicKey);
      }

      // Get shielded balance
      let shieldedAmount: number;

      if (useMock) {
        // Mock mode - return placeholder values
        shieldedAmount = 0;
      } else {
        // Real mode - query Privacy Cash SDK
        try {
          // Get the RPC URL from the connection
          // The connection is already configured, we can use its endpoint
          const rpcUrl = (config.connection as unknown as { _rpcEndpoint: string })._rpcEndpoint ||
                         process.env.SPYK_RPC_URL ||
                         'https://api.devnet.solana.com';

          const privacyCash = new PrivacyCash({
            RPC_url: rpcUrl,
            owner: config.keypair,
            enableDebug: false,
          });

          if (token === 'SOL') {
            const result = await privacyCash.getPrivateBalance();
            shieldedAmount = result.lamports / LAMPORTS_PER_SOL;
          } else {
            // USDC
            const result = await privacyCash.getPrivateBalanceUSDC();
            shieldedAmount = result.base_units / Math.pow(10, USDC_DECIMALS);
          }
        } catch (privacyError) {
          // If Privacy Cash SDK fails (e.g., no account exists), return 0
          console.error('[SPYK MCP] Privacy Cash balance query failed:', privacyError);
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
