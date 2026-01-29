import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory payment tracking (demo only)
const verifiedPayments = new Set<string>();

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

async function verifyPaymentProof(proof: string): Promise<boolean> {
  if (process.env.SPYK_USE_MOCK_FACILITATOR === 'true') {
    console.log('[MOCK] Payment verified:', proof.substring(0, 20) + '...');
    return true;
  }
  // Real verification would call x402 facilitator
  // TODO: Implement real verification in tk-402.10
  return false;
}
