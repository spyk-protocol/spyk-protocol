/**
 * Spyk SDK Client Singleton
 *
 * Provides a shared Spyk SDK instance for all MCP tools.
 * Loads configuration from environment variables and initializes once.
 */

import { Keypair } from '@solana/web3.js';
import { Spyk, type SpykConfig } from '../../../dist/index.mjs';
import { loadWalletConfig } from './wallet.js';
import 'dotenv/config';

// ============================================
// Singleton State
// ============================================

let spykClient: Spyk | null = null;
let mockMode = false;

// ============================================
// Configuration Helpers
// ============================================

/**
 * Load RPC configuration from environment variables
 * Priority: HELIUS_API_KEY > SPYK_RPC_URL
 */
function loadRpcConfig(): Pick<SpykConfig, 'heliusApiKey' | 'customRpcUrl' | 'rpcProvider'> {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const customRpcUrl = process.env.SPYK_RPC_URL;

  if (heliusApiKey) {
    return {
      heliusApiKey,
      rpcProvider: 'helius',
    };
  }

  if (customRpcUrl) {
    return {
      customRpcUrl,
      rpcProvider: 'custom',
    };
  }

  // Fallback to public devnet endpoint
  return {
    customRpcUrl: 'https://api.devnet.solana.com',
    rpcProvider: 'custom',
  };
}

/**
 * Load network configuration from environment variables
 */
function loadNetworkConfig(): 'devnet' | 'mainnet' {
  const network = process.env.SPYK_NETWORK || 'devnet';

  if (network !== 'devnet' && network !== 'mainnet' && network !== 'mainnet-beta') {
    console.warn(`[SPYK MCP] Invalid SPYK_NETWORK="${network}", defaulting to devnet`);
    return 'devnet';
  }

  // Normalize mainnet-beta to mainnet
  return network === 'mainnet-beta' ? 'mainnet' : network as 'devnet' | 'mainnet';
}

/**
 * Initialize the Spyk SDK client
 */
function initializeSpykClient(): Spyk {
  try {
    // Load wallet configuration (handles SPYK_PRIVATE_KEY / SPYK_KEYPAIR_PATH)
    const walletConfig = loadWalletConfig();

    // Load RPC configuration
    const rpcConfig = loadRpcConfig();

    // Load network
    const network = loadNetworkConfig();

    // Build Spyk SDK config
    const config: SpykConfig = {
      ...rpcConfig,
      network,
      wallet: walletConfig.keypair,
    };

    // Check mock mode
    mockMode = process.env.SPYK_USE_MOCK_FACILITATOR === 'true';

    // Initialize Spyk SDK
    const client = new Spyk(config, {
      useMockFacilitator: mockMode,
    });

    console.error('[SPYK MCP] Initialized Spyk SDK');
    console.error(`  Network: ${network}`);
    console.error(`  Wallet: ${walletConfig.publicKey}`);
    console.error(`  RPC Provider: ${rpcConfig.rpcProvider}`);
    console.error(`  Mock Mode: ${mockMode}`);

    return client;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to initialize Spyk SDK: ${message}`);
  }
}

// ============================================
// Public API
// ============================================

/**
 * Get the shared Spyk SDK client instance
 *
 * Initializes the client on first call and returns the same instance
 * for subsequent calls. This ensures all MCP tools share the same
 * connection and wallet configuration.
 *
 * @returns Spyk SDK client instance
 * @throws Error if client initialization fails
 */
export function getSpykClient(): Spyk {
  if (!spykClient) {
    spykClient = initializeSpykClient();
  }
  return spykClient;
}

/**
 * Check if the SDK is running in mock mode
 *
 * Mock mode is enabled via SPYK_USE_MOCK_FACILITATOR=true.
 * In mock mode, x402 payments use a mock facilitator instead of
 * real on-chain transactions.
 *
 * @returns True if mock mode is enabled
 */
export function isMockMode(): boolean {
  // Ensure client is initialized to set mockMode
  if (!spykClient) {
    getSpykClient();
  }
  return mockMode;
}

/**
 * Reset the singleton (for testing only)
 * @internal
 */
export function resetSpykClient(): void {
  spykClient = null;
  mockMode = false;
}
