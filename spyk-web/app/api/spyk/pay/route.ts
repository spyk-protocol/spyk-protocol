import { NextRequest } from 'next/server';
import { getSpykInstance, handleApiError } from '../lib';

/**
 * x402 Payment Response structure
 */
interface X402Response {
  error?: string;
  x402?: {
    version: string;
    amount: string;
    token: string;
    network: string;
    recipient: string;
    memo?: string;
    facilitator?: string;
  };
}

/**
 * POST /api/spyk/pay
 *
 * Handles x402 ephemeral payments using DevnetX402Facilitator.
 * Flow:
 * 1. Fetch URL to check for 402 Payment Required
 * 2. Parse x402 payment details
 * 3. Validate amount against maxAmount
 * 4. Make private payment from shielded balance
 * 5. Retry original URL with payment proof
 * 6. Return the API response
 */
export async function POST(req: NextRequest) {
  try {
    const { url, maxAmount = 0.01 } = await req.json();

    if (!url) {
      return Response.json(
        { error: 'URL is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const spyk = await getSpykInstance();

    // 1. Fetch the URL to check for 402
    const response = await fetch(url);

    if (response.status !== 402) {
      // Not a 402, just return the response
      if (response.ok) {
        const data = await response.json().catch(() => response.text());
        return Response.json({
          paid: false,
          message: 'No payment required - URL returned success',
          apiResponse: data,
        });
      } else {
        return Response.json(
          {
            error: `URL returned ${response.status}: ${response.statusText}`,
            code: 'REQUEST_FAILED',
          },
          { status: 400 }
        );
      }
    }

    // 2. Parse x402 payment details
    const body = (await response.json()) as X402Response;

    if (!body.x402) {
      return Response.json(
        { error: '402 response missing x402 payment details', code: 'INVALID_X402' },
        { status: 400 }
      );
    }

    const x402 = body.x402;
    const requestedAmount = parseFloat(x402.amount);
    const token = x402.token.toUpperCase() as 'SOL' | 'USDC';

    // 3. Validate amount
    if (requestedAmount > maxAmount) {
      return Response.json(
        {
          error: `Amount ${requestedAmount} ${token} exceeds maximum ${maxAmount} SOL`,
          code: 'AMOUNT_EXCEEDED',
          requestedAmount: `${requestedAmount} ${token}`,
          maxAmount: `${maxAmount} SOL`,
        },
        { status: 400 }
      );
    }

    // 4. Validate token type
    if (token !== 'SOL' && token !== 'USDC') {
      return Response.json(
        {
          error: `Unsupported token: ${token}. Only SOL and USDC are supported for private payments.`,
          code: 'UNSUPPORTED_TOKEN',
        },
        { status: 400 }
      );
    }

    console.log(`[SPYK API /pay] Executing private payment: ${requestedAmount} ${token} to ${x402.recipient}`);

    // 5. Make private payment from shielded balance
    // This withdraws to the recipient address, breaking the link between user and payment
    const result = await spyk.withdraw(token, requestedAmount, x402.recipient);
    const proof = result.signature;

    console.log(`[SPYK API /pay] Private payment successful. Signature: ${proof}`);

    // 6. Retry original URL with payment proof
    const retryResponse = await fetch(url, {
      headers: {
        'X-Payment-Proof': proof,
      },
    });

    let apiResponse: unknown = null;

    if (!retryResponse.ok) {
      // Try POST to verify the payment
      const verifyResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentProof: proof }),
      });

      if (!verifyResponse.ok) {
        // Payment was made but verification failed - still return success with proof
        return Response.json({
          paid: true,
          verified: false,
          signature: proof,
          explorerUrl: `https://solscan.io/tx/${proof}?cluster=devnet`,
          amount: `${requestedAmount} ${token}`,
          message: `Payment submitted but verification failed: ${retryResponse.status}`,
        });
      }

      // Retry GET after verification
      const finalResponse = await fetch(url, {
        headers: {
          'X-Payment-Proof': proof,
        },
      });

      if (finalResponse.ok) {
        apiResponse = await finalResponse.json().catch(() => finalResponse.text());
      }
    } else {
      // Success on first retry
      apiResponse = await retryResponse.json().catch(() => retryResponse.text());
    }

    return Response.json({
      paid: true,
      verified: true,
      signature: proof,
      explorerUrl: `https://solscan.io/tx/${proof}?cluster=devnet`,
      amount: `${requestedAmount} ${token}`,
      apiResponse,
      message: `Paid ${requestedAmount} ${token} privately and retrieved data`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
