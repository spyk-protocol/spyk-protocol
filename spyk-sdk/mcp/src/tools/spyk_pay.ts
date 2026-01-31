import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PrivacyCash } from 'privacycash';
import { loadWalletConfig } from '../config/wallet.js';
import type { Tool } from './index.js';

interface PayInput {
  url: string;
  maxAmount?: number;
}

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

interface PayResult {
  success: boolean;
  paid?: boolean;
  amount?: string;
  token?: string;
  proof?: string;
  data?: unknown;
  message: string;
}

/** USDC decimals on Solana */
const USDC_DECIMALS = 6;

/**
 * spyk_pay - Pay for x402 API privately
 *
 * Handles the full x402 payment flow:
 * 1. Fetch URL, check for 402 response
 * 2. Parse x402 payment details
 * 3. Validate amount against maxAmount
 * 4. Make private payment from shielded balance
 * 5. Retry original URL with payment proof
 * 6. Return the API response
 */
export const spyk_pay: Tool = {
  name: 'spyk_pay',
  description: 'Pay for an x402 API endpoint privately using shielded funds. Automatically handles the payment flow and retries the request.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL that returned 402 Payment Required',
      },
      maxAmount: {
        type: 'number',
        description: 'Maximum amount in SOL willing to pay. Defaults to 0.01 SOL.',
      },
    },
    required: ['url'],
  },
  async handler(args: Record<string, unknown>): Promise<PayResult> {
    const input = args as unknown as PayInput;
    const maxAmount = input.maxAmount || 0.01;

    if (!input.url) {
      throw new Error('URL is required');
    }

    try {
      // 1. Fetch the URL to check for 402
      const response = await fetch(input.url);

      if (response.status !== 402) {
        // Not a 402, just return the response
        if (response.ok) {
          const data = await response.json().catch(() => response.text());
          return {
            success: true,
            paid: false,
            message: 'No payment required - URL returned success',
            data,
          };
        } else {
          return {
            success: false,
            paid: false,
            message: `URL returned ${response.status}: ${response.statusText}`,
          };
        }
      }

      // 2. Parse x402 payment details
      const body = (await response.json()) as X402Response;

      if (!body.x402) {
        throw new Error('402 response missing x402 payment details');
      }

      const x402 = body.x402;
      const requestedAmount = parseFloat(x402.amount);

      // 3. Validate amount
      if (requestedAmount > maxAmount) {
        return {
          success: false,
          paid: false,
          amount: `${requestedAmount} ${x402.token}`,
          message: `Amount ${requestedAmount} ${x402.token} exceeds maximum ${maxAmount} SOL`,
        };
      }

      // 4. Make private payment from shielded balance
      const useMock = process.env.SPYK_USE_MOCK_FACILITATOR === 'true';
      let proof: string;

      if (useMock) {
        // Generate mock payment proof for testing
        proof = `mock_${Date.now()}_${x402.amount}_${x402.recipient.slice(0, 8)}`;
        console.log('[SPYK MCP] Mock payment proof:', proof);
      } else {
        // Real payment using Privacy Cash withdraw
        const config = loadWalletConfig();
        const rpcUrl = process.env.SPYK_RPC_URL || config.connection.rpcEndpoint;

        const privacyCashClient = new PrivacyCash({
          RPC_url: rpcUrl,
          owner: config.keypair,
          enableDebug: false,
        });

        const token = x402.token.toUpperCase();

        if (token === 'SOL') {
          // Convert SOL to lamports
          const lamports = Math.floor(requestedAmount * LAMPORTS_PER_SOL);

          console.log(`[SPYK MCP] Executing private payment: ${requestedAmount} SOL to ${x402.recipient}`);

          const result = await privacyCashClient.withdraw({
            lamports,
            recipientAddress: x402.recipient,
          });

          // Transaction signature IS the payment proof
          proof = result.tx;
          console.log(`[SPYK MCP] Private payment successful. Signature: ${proof}`);
        } else if (token === 'USDC') {
          // Convert USDC to base units
          const baseUnits = Math.floor(requestedAmount * Math.pow(10, USDC_DECIMALS));

          console.log(`[SPYK MCP] Executing private USDC payment: ${requestedAmount} USDC to ${x402.recipient}`);

          const result = await privacyCashClient.withdrawUSDC({
            base_units: baseUnits,
            recipientAddress: x402.recipient,
          });

          proof = result.tx;
          console.log(`[SPYK MCP] Private USDC payment successful. Signature: ${proof}`);
        } else {
          throw new Error(`Unsupported token: ${token}. Only SOL and USDC are supported for private payments.`);
        }
      }

      // 5. Retry original URL with payment proof
      const retryResponse = await fetch(input.url, {
        headers: {
          'X-Payment-Proof': proof,
        },
      });

      if (!retryResponse.ok) {
        // Try POST to verify the payment
        const verifyResponse = await fetch(input.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentProof: proof }),
        });

        if (!verifyResponse.ok) {
          return {
            success: false,
            paid: true,
            proof,
            amount: `${requestedAmount} ${x402.token}`,
            message: `Payment submitted but verification failed: ${retryResponse.status}`,
          };
        }

        // Retry GET after verification
        const finalResponse = await fetch(input.url, {
          headers: {
            'X-Payment-Proof': proof,
          },
        });

        if (finalResponse.ok) {
          const data = await finalResponse.json().catch(() => finalResponse.text());
          return {
            success: true,
            paid: true,
            proof,
            amount: `${requestedAmount} ${x402.token}`,
            token: x402.token,
            data,
            message: `Paid ${requestedAmount} ${x402.token} privately and retrieved data`,
          };
        }
      }

      // Success on first retry
      const data = await retryResponse.json().catch(() => retryResponse.text());
      return {
        success: true,
        paid: true,
        proof,
        amount: `${requestedAmount} ${x402.token}`,
        token: x402.token,
        data,
        message: `Paid ${requestedAmount} ${x402.token} privately and retrieved data`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Payment failed: ${message}`);
    }
  },
};
