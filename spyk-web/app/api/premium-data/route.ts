import { NextRequest, NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Simple in-memory payment tracking (demo only)
const verifiedPayments = new Set<string>();

// Expected payment configuration
const REQUIRED_AMOUNT_SOL = 0.001;
const EXPECTED_RECIPIENT = process.env.DEMO_RECIPIENT_ADDRESS || '';

// Get RPC endpoint
function getRpcEndpoint(): string {
  const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (heliusApiKey) {
    return `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }
  // Fallback to public devnet RPC (rate limited)
  return 'https://api.devnet.solana.com';
}

export async function GET(request: NextRequest) {
  const paymentProof = request.headers.get('X-Payment-Proof');

  // Check if payment was already verified
  if (paymentProof && verifiedPayments.has(paymentProof)) {
    return NextResponse.json({
      data: {
        city: 'NYC',
        weather: 'Sunny',
        temperature: '72°F',
        humidity: '45%',
        source: 'SPYK Premium Weather API'
      },
      timestamp: new Date().toISOString(),
      paymentStatus: 'verified'
    });
  }

  // Return 402 Payment Required
  return NextResponse.json({
    error: 'Payment Required',
    x402: {
      version: '1.0',
      amount: '0.001',
      token: 'SOL',
      network: 'devnet',
      recipient: process.env.DEMO_RECIPIENT_ADDRESS || 'DemoRecipientPubkey...',
      memo: 'premium-weather-data',
      facilitator: process.env.X402_FACILITATOR_URL || 'https://x402-devnet.solana.com'
    }
  }, {
    status: 402,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'X-Payment-Proof, Content-Type'
    }
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Payment-Proof, Content-Type'
    }
  });
}

// POST endpoint for payment verification (called after x402 payment)
export async function POST(request: NextRequest) {
  const { paymentProof } = await request.json();

  // In real impl, verify with x402 facilitator
  // For demo, we'll use mock or real verification based on env
  const isValid = await verifyPaymentProof(paymentProof);

  if (isValid) {
    verifiedPayments.add(paymentProof);
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ verified: false, error: 'Invalid payment' }, { status: 400 });
}

interface VerificationResult {
  valid: boolean;
  reason?: string;
  details?: {
    slot: number;
    blockTime: number | null;
    recipient: string;
    amountLamports: number;
    amountSol: number;
  };
}

async function verifyPaymentProof(proof: string): Promise<boolean> {
  // Mock mode for testing
  if (process.env.SPYK_USE_MOCK_FACILITATOR === 'true') {
    console.log('[MOCK] Payment verified:', proof.substring(0, 20) + '...');
    return true;
  }

  // Validate proof format (Solana transaction signatures are base58-encoded, 87-88 chars)
  if (!proof || proof.length < 80 || proof.length > 100) {
    console.log('[VERIFY] Invalid proof format:', proof?.substring(0, 20) || 'empty');
    return false;
  }

  const result = await verifyOnChainTransaction(proof);

  if (result.valid) {
    console.log('[VERIFY] Payment verified on-chain:', {
      signature: proof.substring(0, 20) + '...',
      recipient: result.details?.recipient,
      amount: result.details?.amountSol,
    });
  } else {
    console.log('[VERIFY] Payment verification failed:', result.reason);
  }

  return result.valid;
}

/**
 * Verify a payment transaction on Solana devnet
 *
 * This verifies:
 * 1. Transaction exists and succeeded
 * 2. Recipient matches expected address (if configured)
 * 3. Amount meets minimum requirement
 */
async function verifyOnChainTransaction(signature: string): Promise<VerificationResult> {
  try {
    const connection = new Connection(getRpcEndpoint(), 'confirmed');

    // Fetch the transaction with parsed instructions
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, reason: 'Transaction not found' };
    }

    if (tx.meta?.err) {
      return { valid: false, reason: `Transaction failed: ${JSON.stringify(tx.meta.err)}` };
    }

    // Look for SOL transfer in the transaction
    // The payment could be a SystemProgram transfer or could be part of a more complex transaction
    const transferInfo = extractTransferInfo(tx);

    if (!transferInfo) {
      return { valid: false, reason: 'No SOL transfer found in transaction' };
    }

    // Verify recipient if expected recipient is configured
    if (EXPECTED_RECIPIENT) {
      try {
        const expectedPubkey = new PublicKey(EXPECTED_RECIPIENT);
        if (transferInfo.recipient !== expectedPubkey.toBase58()) {
          return {
            valid: false,
            reason: `Recipient mismatch: expected ${EXPECTED_RECIPIENT}, got ${transferInfo.recipient}`
          };
        }
      } catch {
        // If recipient address is invalid, skip recipient check
        console.warn('[VERIFY] Invalid DEMO_RECIPIENT_ADDRESS, skipping recipient check');
      }
    }

    // Verify amount meets minimum requirement
    const requiredLamports = Math.floor(REQUIRED_AMOUNT_SOL * LAMPORTS_PER_SOL);
    if (transferInfo.amountLamports < requiredLamports) {
      return {
        valid: false,
        reason: `Amount too low: required ${REQUIRED_AMOUNT_SOL} SOL, got ${transferInfo.amountLamports / LAMPORTS_PER_SOL} SOL`
      };
    }

    return {
      valid: true,
      details: {
        slot: tx.slot,
        blockTime: tx.blockTime ?? null,
        recipient: transferInfo.recipient,
        amountLamports: transferInfo.amountLamports,
        amountSol: transferInfo.amountLamports / LAMPORTS_PER_SOL,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VERIFY] Error verifying transaction:', message);
    return { valid: false, reason: `Verification error: ${message}` };
  }
}

/**
 * Extract transfer information from a parsed transaction
 * Handles both direct SystemProgram transfers and transfers within complex transactions
 */
function extractTransferInfo(
  tx: Awaited<ReturnType<Connection['getParsedTransaction']>>
): { recipient: string; amountLamports: number } | null {
  if (!tx?.transaction?.message?.instructions) {
    return null;
  }

  // Look for SystemProgram transfer instruction
  for (const instruction of tx.transaction.message.instructions) {
    if ('parsed' in instruction && instruction.program === 'system') {
      const parsed = instruction.parsed;
      if (parsed.type === 'transfer') {
        return {
          recipient: parsed.info.destination,
          amountLamports: parsed.info.lamports,
        };
      }
    }
  }

  // Also check inner instructions (for complex transactions like Privacy Cash withdrawals)
  if (tx.meta?.innerInstructions) {
    for (const inner of tx.meta.innerInstructions) {
      for (const instruction of inner.instructions) {
        if ('parsed' in instruction && instruction.program === 'system') {
          const parsed = instruction.parsed;
          if (parsed.type === 'transfer') {
            return {
              recipient: parsed.info.destination,
              amountLamports: parsed.info.lamports,
            };
          }
        }
      }
    }
  }

  // Fallback: check post balances for significant SOL movements
  // This helps verify ShadowWire transactions where the transfer might be obfuscated
  if (tx.meta?.postBalances && tx.meta?.preBalances && tx.transaction?.message?.accountKeys) {
    const accountKeys = tx.transaction.message.accountKeys;

    // Find accounts that received SOL
    for (let i = 0; i < accountKeys.length; i++) {
      const preBalance = tx.meta.preBalances[i] ?? 0;
      const postBalance = tx.meta.postBalances[i] ?? 0;
      const delta = postBalance - preBalance;

      // If account received significant SOL (more than just rent)
      if (delta > 10000) { // More than 0.00001 SOL
        const accountKey = accountKeys[i];
        const pubkey = typeof accountKey === 'string' ? accountKey : accountKey.pubkey.toBase58();
        return {
          recipient: pubkey,
          amountLamports: delta,
        };
      }
    }
  }

  return null;
}
