/**
 * SDK Configuration
 * Loads environment variables for RPC connection
 * Supports multiple RPC providers: Helius, Quicknode, or custom
 */

import { Connection } from '@solana/web3.js';

/**
 * Supported RPC providers
 */
export type RpcProvider = 'helius' | 'quicknode' | 'custom';


/**
 * SDK configuration interface
 */
export interface SpykConfig {
  rpcProvider?: RpcProvider;
  heliusApiKey?: string;
  quicknodeUrl?: string;
  customRpcUrl?: string;
  cluster?: 'mainnet' | 'devnet';
  /** @deprecated Use customRpcUrl instead */
  rpcUrl?: string;

  // Compliance Configuration (OPT-IN only)
  /**
   * Range Protocol API key for OFAC/sanctions screening
   * Get one at https://range.org or contact info@range.org
   */
  rangeApiKey?: string;
  /**
   * Enable compliance checking (requires rangeApiKey to be set)
   * Default: false - compliance is OPT-IN only
   */
  enableCompliance?: boolean;

}

/**
 * Get configuration from environment variables
 * Supports either Helius API key OR Quicknode URL
 * @throws Error if neither HELIUS_API_KEY nor QUICKNODE_URL is set
 */
export function getConfig(): SpykConfig {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const quicknodeUrl = process.env.QUICKNODE_URL;
  const customRpcUrl = process.env.SOLANA_RPC_URL;
  const cluster = (process.env.SOLANA_CLUSTER as 'mainnet' | 'devnet') || 'mainnet';

  // Compliance configuration (opt-in)
  const rangeApiKey = process.env.RANGE_API_KEY;
  const enableCompliance = process.env.ENABLE_COMPLIANCE === 'true';


  // Allow either Helius OR Quicknode OR custom RPC
  if (!heliusApiKey && !quicknodeUrl && !customRpcUrl) {
    throw new Error(
      'Either HELIUS_API_KEY, QUICKNODE_URL, or SOLANA_RPC_URL environment variable is required. ' +
      'Get a Helius key at https://helius.xyz or Quicknode endpoint at https://quicknode.com'
    );
  }

  // Determine provider based on what's configured
  let rpcProvider: RpcProvider;
  if (quicknodeUrl) {
    rpcProvider = 'quicknode';
  } else if (customRpcUrl) {
    rpcProvider = 'custom';
  } else {
    rpcProvider = 'helius';
  }

  return {
    rpcProvider,
    heliusApiKey,
    quicknodeUrl,
    customRpcUrl,
    cluster,
    // Backward compatibility
    rpcUrl: customRpcUrl,
    // Compliance (opt-in)
    rangeApiKey,
    enableCompliance,
  };
}

/**
 * Get Helius RPC URL for a given API key
 */
export function getHeliusRpcUrl(apiKey: string, cluster: 'mainnet' | 'devnet' = 'mainnet'): string {
  const subdomain = cluster === 'mainnet' ? 'mainnet' : 'devnet';
  return `https://${subdomain}.helius-rpc.com/?api-key=${apiKey}`;
}

/**
 * Create a Solana Connection based on the configured RPC provider
 * @param config - SDK configuration (from getConfig())
 * @returns Solana Connection instance
 * @throws Error if required provider configuration is missing
 */
export function createConnection(config: SpykConfig): Connection {
  switch (config.rpcProvider) {
    case 'quicknode':
      if (!config.quicknodeUrl) {
        throw new Error('QUICKNODE_URL is required for quicknode provider');
      }
      return new Connection(config.quicknodeUrl);

    case 'custom':
      if (!config.customRpcUrl) {
        throw new Error('SOLANA_RPC_URL is required for custom provider');
      }
      return new Connection(config.customRpcUrl);

    case 'helius':
    default:
      if (!config.heliusApiKey) {
        throw new Error('HELIUS_API_KEY is required for helius provider');
      }
      return new Connection(getHeliusRpcUrl(config.heliusApiKey, config.cluster));
  }
}
