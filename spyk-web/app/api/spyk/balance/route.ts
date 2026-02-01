import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSpykInstance, getConnection, getKeypair, handleApiError } from '../lib';

/**
 * GET /api/spyk/balance
 *
 * Returns the current balance state for the demo wallet:
 * - shielded: Privacy Cash private balance (available for x402 payments)
 * - public: On-chain wallet balance
 * - total: Combined balance
 *
 * All values are in SOL.
 */
export async function GET() {
  try {
    const spyk = await getSpykInstance();
    const connection = getConnection();
    const keypair = getKeypair();

    // Get shielded balance from Privacy Cash (SOL)
    let shielded = 0;
    try {
      const balanceResult = await spyk.getBalance('SOL');
      // BalanceResult has amount in lamports (bigint)
      if ('amount' in balanceResult) {
        shielded = Number(balanceResult.amount) / LAMPORTS_PER_SOL;
      }
    } catch {
      // If no Privacy Cash account exists, shielded balance is 0
      shielded = 0;
    }

    // Get public (on-chain) balance
    const publicLamports = await connection.getBalance(keypair.publicKey);
    const publicBalance = publicLamports / LAMPORTS_PER_SOL;

    // Calculate total
    const total = shielded + publicBalance;

    return Response.json({
      shielded,
      public: publicBalance,
      total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
