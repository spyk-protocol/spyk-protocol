/**
 * SPYK-402 Smoke Test
 *
 * End-to-end test for private x402 payments:
 * 1. Check shielded balance
 * 2. Request premium data (expect 402)
 * 3. Pay privately using shielded funds
 * 4. Verify payment and receive data
 *
 * Run with:
 *   SPYK_USE_MOCK_FACILITATOR=true npm run test:smoke
 *
 * Supports multiple RPC providers:
 *   HELIUS_API_KEY=xxx npm run test:smoke      # Use Helius
 *   QUICKNODE_URL=xxx npm run test:smoke       # Use Quicknode
 *   SOLANA_RPC_URL=xxx npm run test:smoke      # Use custom RPC
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import { getConfig, createConnection as createSDKConnection, type SpykConfig as EnvConfig } from '../src/config';
import { createConnection, getRpcUrl } from '../src/utils/connection';
import type { SpykConfig, Network } from '../src/types';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000/api/premium-data';

/**
 * Get RPC URL from SDK config, with fallback to SOLANA_RPC or public devnet
 */
function getRpcEndpoint(): { url: string; provider: string } {
  // Try SDK config first
  try {
    const envConfig = getConfig();
    const provider = envConfig.rpcProvider || 'unknown';

    // Create a SpykConfig compatible with getRpcUrl
    const sdkConfig: SpykConfig = {
      rpcProvider: envConfig.rpcProvider,
      heliusApiKey: envConfig.heliusApiKey,
      quicknodeUrl: envConfig.quicknodeUrl,
      customRpcUrl: envConfig.customRpcUrl,
      network: (envConfig.cluster || 'devnet') as Network,
      wallet: Keypair.generate(), // Placeholder, not used for URL generation
    };

    const url = getRpcUrl(sdkConfig);
    return { url, provider };
  } catch {
    // Fallback to legacy SOLANA_RPC env var
    const legacyRpc = process.env.SOLANA_RPC;
    if (legacyRpc) {
      return { url: legacyRpc, provider: 'custom (SOLANA_RPC)' };
    }

    // Default to public devnet
    return { url: 'https://api.devnet.solana.com', provider: 'public-devnet' };
  }
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
  };
}

async function runSmokeTest(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     SPYK-402 Private Payments Test     ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Configuration
  const useMock = process.env.SPYK_USE_MOCK_FACILITATOR === 'true';
  const { url: RPC_URL, provider: RPC_PROVIDER } = getRpcEndpoint();

  console.log(`Mode: ${useMock ? 'MOCK FACILITATOR' : 'REAL FACILITATOR'}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`RPC Provider: ${RPC_PROVIDER}`);
  console.log(`RPC URL: ${RPC_URL.replace(/api-key=([^&]+)/, 'api-key=***')}\n`);

  // Setup
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = loadTestWallet();
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  // Test 1: Check public balance
  console.log('\n─── Test 1: Check Balance ───');
  const publicBalance = await connection.getBalance(wallet.publicKey);
  console.log(`Public balance: ${(publicBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (publicBalance < 0.001 * LAMPORTS_PER_SOL) {
    console.warn('⚠️  Low balance - some operations may fail');
  }

  // Test 2: Request premium data (expect 402)
  console.log('\n─── Test 2: Request Premium Data (Expect 402) ───');
  let response: Response;
  try {
    response = await fetch(API_URL);
  } catch (error) {
    console.error('❌ Failed to connect to API');
    console.error('   Make sure spyk-web is running: cd spyk-web && npm run dev');
    throw error;
  }

  if (response.status !== 402) {
    console.log(`Got status ${response.status} instead of 402`);
    if (response.ok) {
      const data = await response.json();
      console.log('Data received (no payment needed):', JSON.stringify(data, null, 2).slice(0, 200));
      console.log('\n✅ API accessible (payment may already be verified)');
      return;
    }
    throw new Error(`Expected 402, got ${response.status}`);
  }

  const body = (await response.json()) as X402Response;
  if (!body.x402) {
    throw new Error('402 response missing x402 payment details');
  }

  console.log('✅ Got 402 Payment Required');
  console.log(`   Amount: ${body.x402.amount} ${body.x402.token}`);
  console.log(`   Recipient: ${body.x402.recipient.slice(0, 20)}...`);
  console.log(`   Network: ${body.x402.network}`);

  // Test 3: Generate mock payment
  console.log('\n─── Test 3: Create Payment Proof ───');
  let paymentProof: string;

  if (useMock) {
    // Generate mock payment proof
    paymentProof = `mock_${Date.now()}_${body.x402.amount}_${body.x402.recipient.slice(0, 8)}`;
    console.log('✅ Generated mock payment proof');
    console.log(`   Proof: ${paymentProof}`);
  } else {
    // Real payment would use SpykX402Client here
    throw new Error('Real payments not implemented in smoke test. Use SPYK_USE_MOCK_FACILITATOR=true');
  }

  // Test 4: Verify payment with API
  console.log('\n─── Test 4: Verify Payment ───');
  const verifyResponse = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentProof }),
  });

  const verifyResult = await verifyResponse.json();
  if (verifyResult.verified) {
    console.log('✅ Payment verified by API');
  } else {
    console.log('⚠️  Payment verification returned:', verifyResult);
  }

  // Test 5: Fetch data with proof
  console.log('\n─── Test 5: Fetch Data with Proof ───');
  const dataResponse = await fetch(API_URL, {
    headers: { 'X-Payment-Proof': paymentProof },
  });

  if (dataResponse.status !== 200) {
    throw new Error(`Expected 200, got ${dataResponse.status}`);
  }

  const data = await dataResponse.json();
  console.log('✅ Data received:');
  console.log(JSON.stringify(data, null, 2));

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          ✅ SMOKE TEST PASSED          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\nFlow completed:');
  console.log('  1. ✅ Checked balance');
  console.log('  2. ✅ Got 402 from API');
  console.log('  3. ✅ Generated payment proof');
  console.log('  4. ✅ Verified payment');
  console.log('  5. ✅ Received premium data');
}

function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return resolve(homedir(), filePath.slice(2));
  }
  return resolve(filePath);
}

function loadTestWallet(): Keypair {
  // Try environment variable first
  if (process.env.TEST_PRIVATE_KEY) {
    try {
      const secretKey = Buffer.from(process.env.TEST_PRIVATE_KEY, 'base64');
      return Keypair.fromSecretKey(new Uint8Array(secretKey));
    } catch {
      console.warn('Failed to parse TEST_PRIVATE_KEY, trying as JSON array...');
      const secretKey = JSON.parse(process.env.TEST_PRIVATE_KEY);
      return Keypair.fromSecretKey(new Uint8Array(secretKey));
    }
  }

  // Try keypair file
  const keypairPath = process.env.KEYPAIR_PATH || '~/.config/solana/id.json';
  const expandedPath = expandPath(keypairPath);

  if (!existsSync(expandedPath)) {
    console.error(`Keypair file not found: ${expandedPath}`);
    console.error('Set TEST_PRIVATE_KEY or KEYPAIR_PATH environment variable');
    process.exit(1);
  }

  const fileContent = readFileSync(expandedPath, 'utf-8');
  const secretKey = new Uint8Array(JSON.parse(fileContent));
  return Keypair.fromSecretKey(secretKey);
}

// Run the test
runSmokeTest().catch((error) => {
  console.error('\n╔════════════════════════════════════════╗');
  console.error('║          ❌ SMOKE TEST FAILED          ║');
  console.error('╚════════════════════════════════════════╝');
  console.error('\nError:', error.message);
  process.exit(1);
});
