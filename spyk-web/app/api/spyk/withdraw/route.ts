import { NextRequest } from 'next/server';
import { getSpykInstance, handleApiError } from '../lib';

export async function POST(req: NextRequest) {
  try {
    const { amount, token = 'SOL', recipient } = await req.json();
    const spyk = await getSpykInstance();
    const result = await spyk.withdraw(token, amount, recipient);
    return Response.json({
      signature: result.signature,
      explorerUrl: `https://solscan.io/tx/${result.signature}?cluster=devnet`
    });
  } catch (error) {
    return handleApiError(error);
  }
}
