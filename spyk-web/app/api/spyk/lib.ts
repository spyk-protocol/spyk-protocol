/**
 * Shared API Library for Spyk Protocol API Routes
 *
 * Provides centralized keypair loading, SDK initialization, and error handling
 * for all /api/spyk/* routes.
 */

import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { Spyk, DevnetX402Facilitator } from '@spyk-protocol/sdk';

// ============================================
// Environment Configuration
// ============================================

/**
 * Get RPC endpoint from environment
 */
function getRpcEndpoint(): string {
  const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;
  if (heliusApiKey) {
    return `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  // Fallback to public devnet RPC (rate limited)
  return 'https://api.devnet.solana.com';
}

// ============================================
// Keypair Loading
// ============================================

/**
 * Load keypair from SPYK_DEMO_KEYPAIR environment variable
 * @throws Error if env var is not set or invalid
 */
export function getKeypair(): Keypair {
  const privateKey = process.env.SPYK_DEMO_KEYPAIR;

  if (!privateKey) {
    throw new Error(
      'SPYK_DEMO_KEYPAIR environment variable not set. ' +
      'Set it to a base58-encoded private key for the demo wallet.'
    );
  }

  try {
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(
      'Invalid SPYK_DEMO_KEYPAIR: must be a valid base58-encoded secret key'
    );
  }
}

// ============================================
// SDK Initialization
// ============================================

// Singleton instances for connection reuse
let cachedConnection: Connection | null = null;
let cachedSpyk: Spyk | null = null;

/**
 * Get a Solana connection (singleton)
 */
export function getConnection(): Connection {
  if (!cachedConnection) {
    cachedConnection = new Connection(getRpcEndpoint(), 'confirmed');
  }
  return cachedConnection;
}

/**
 * Get an initialized Spyk SDK instance
 *
 * Uses:
 * - MockPrivacyCash for devnet (Privacy Cash has no devnet relayer)
 * - DevnetX402Facilitator for real devnet transactions
 *
 * @returns Initialized Spyk instance configured for devnet
 */
export async function getSpykInstance(): Promise<Spyk> {
  if (cachedSpyk) {
    return cachedSpyk;
  }

  const keypair = getKeypair();
  const connection = getConnection();

  // Create DevnetX402Facilitator for real on-chain x402 payments
  const x402Facilitator = new DevnetX402Facilitator({
    connection,
    fundingKeypair: keypair,
    logPayments: true,
  });

  // Initialize Spyk with MockPrivacyCash (auto-enabled on devnet)
  const spyk = new Spyk(
    {
      network: 'devnet',
      customRpcUrl: getRpcEndpoint(),
      wallet: keypair,
    },
    {
      // MockPrivacyCash is auto-enabled on devnet, but we can configure it
      mockPrivacyCash: {
        logOperations: true,
        simulateProofDelay: 1500,
        useRealTransfers: true, // Creates real devnet transactions
        colorfulOutput: false, // Disable colors for API logs
        showProgress: false,
        memoPrefix: 'SPYK-API',
      },
      // Configure x402 with logging enabled
      x402: {
        logPayments: true,
      },
    }
  );

  // Set the devnet facilitator for real x402 payments
  spyk.x402.setFacilitator(x402Facilitator);

  cachedSpyk = spyk;
  return spyk;
}

// ============================================
// Error Handling
// ============================================

/**
 * API Error Response structure
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Standard error handler for API routes
 * Converts errors into consistent JSON responses
 *
 * @param error - The error that occurred
 * @returns Response with appropriate status code and error message
 */
export function handleApiError(error: unknown): Response {
  console.error('[SPYK API ERROR]', error);

  // Handle known error types
  if (error instanceof Error) {
    // Environment configuration errors
    if (error.message.includes('SPYK_DEMO_KEYPAIR')) {
      return Response.json(
        { error: error.message, code: 'MISSING_CONFIG' } satisfies ApiErrorResponse,
        { status: 500 }
      );
    }

    // Insufficient balance errors
    if (error.message.includes('Insufficient')) {
      return Response.json(
        { error: error.message, code: 'INSUFFICIENT_BALANCE' } satisfies ApiErrorResponse,
        { status: 400 }
      );
    }

    // Invalid input errors
    if (error.message.includes('Invalid')) {
      return Response.json(
        { error: error.message, code: 'INVALID_INPUT' } satisfies ApiErrorResponse,
        { status: 400 }
      );
    }

    // Generic error with message
    return Response.json(
      { error: error.message } satisfies ApiErrorResponse,
      { status: 500 }
    );
  }

  // Unknown error type
  return Response.json(
    { error: String(error) } satisfies ApiErrorResponse,
    { status: 500 }
  );
}

// ============================================
// Response Helpers
// ============================================

/**
 * Create a success response with standard CORS headers
 */
export function successResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
