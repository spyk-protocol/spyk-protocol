/**
 * RPC Connection Utility
 * Creates and manages connections to Solana RPC endpoints
 * Supports Helius, Quicknode, and custom RPC providers
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  Keypair,
  SendOptions,
  Commitment,
} from '@solana/web3.js';
import {
  SpykConfig,
  Network,
  HeliusConnectionError,
  TransactionError,
} from '../types';

// ============================================
// Constants
// ============================================

const HELIUS_ENDPOINTS = {
  mainnet: 'https://mainnet.helius-rpc.com',
  devnet: 'https://devnet.helius-rpc.com',
} as const;

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [429, 503, 504];

// ============================================
// Types
// ============================================

/** Options for sendSmartTransaction */
export interface SendTransactionOptions {
  /** Maximum retry attempts for transient failures */
  maxRetries?: number;
  /** Base delay between retries in ms (exponential backoff) */
  retryDelayMs?: number;
  /** Skip preflight checks */
  skipPreflight?: boolean;
  /** Commitment level for confirmation */
  commitment?: Commitment;
  /** Callback for logging (optional) */
  onLog?: (message: string) => void;
}

// ============================================
// Connection Functions
// ============================================

/**
 * Get Helius RPC endpoint URL for a network
 */
export function getHeliusEndpoint(apiKey: string, network: Network): string {
  const baseUrl = HELIUS_ENDPOINTS[network];
  return `${baseUrl}/?api-key=${apiKey}`;
}

/**
 * Get the RPC URL for the configured provider
 * @param config - SDK configuration
 * @returns RPC endpoint URL
 */
export function getRpcUrl(config: SpykConfig): string {
  // Check provider type or auto-detect from available config
  const provider = config.rpcProvider ||
    (config.quicknodeUrl ? 'quicknode' :
     config.customRpcUrl ? 'custom' : 'helius');

  switch (provider) {
    case 'quicknode':
      if (!config.quicknodeUrl) {
        throw new HeliusConnectionError('QUICKNODE_URL is required for quicknode provider');
      }
      return config.quicknodeUrl;

    case 'custom':
      if (!config.customRpcUrl) {
        throw new HeliusConnectionError('Custom RPC URL is required for custom provider');
      }
      return config.customRpcUrl;

    case 'helius':
    default:
      if (!config.heliusApiKey) {
        throw new HeliusConnectionError('HELIUS_API_KEY is required for helius provider');
      }
      return getHeliusEndpoint(config.heliusApiKey, config.network);
  }
}

/**
 * Create a Solana Connection using the configured RPC provider
 * Supports Helius, Quicknode, and custom RPC endpoints
 * @param config - SDK configuration with provider details
 * @returns Connection instance
 * @throws HeliusConnectionError if connection fails
 */
export function createConnection(config: SpykConfig): Connection {
  try {
    const endpoint = getRpcUrl(config);

    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    return connection;
  } catch (error) {
    if (error instanceof HeliusConnectionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HeliusConnectionError(`Failed to create RPC connection: ${message}`);
  }
}

/**
 * Create a Solana Connection using Helius RPC
 * @deprecated Use createConnection() instead for multi-provider support
 * @param config - SDK configuration with API key and network
 * @returns Connection instance
 * @throws HeliusConnectionError if connection fails
 */
export function createHeliusConnection(config: SpykConfig): Connection {
  const { heliusApiKey, network } = config;

  if (!heliusApiKey || heliusApiKey.trim() === '') {
    throw new HeliusConnectionError('Helius API key is required');
  }

  const endpoint = getHeliusEndpoint(heliusApiKey, network);

  try {
    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    return connection;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HeliusConnectionError(`Failed to create Helius connection: ${message}`);
  }
}

/**
 * Validate that a connection is working by fetching the latest blockhash
 * @param connection - Connection to validate
 * @throws HeliusConnectionError if validation fails
 */
export async function validateConnection(connection: Connection): Promise<void> {
  try {
    await connection.getLatestBlockhash('confirmed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for common API key errors
    if (message.includes('401') || message.includes('403')) {
      throw new HeliusConnectionError('Invalid Helius API key');
    }

    throw new HeliusConnectionError(`Connection validation failed: ${message}`);
  }
}

// ============================================
// Transaction Functions
// ============================================

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for rate limiting
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }

    // Check for service unavailable
    if (message.includes('503') || message.includes('504') || message.includes('service unavailable')) {
      return true;
    }

    // Check for timeout
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }
  }

  return false;
}

/**
 * Send a transaction with retry logic and smart error handling
 * @param connection - Helius connection
 * @param transaction - Transaction or VersionedTransaction to send
 * @param signers - Keypairs to sign the transaction
 * @param options - Send options
 * @returns Transaction signature
 * @throws TransactionError on failure
 */
export async function sendSmartTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction,
  signers: Keypair[],
  options: SendTransactionOptions = {}
): Promise<string> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    skipPreflight = false,
    commitment = 'confirmed',
    onLog,
  } = options;

  const log = onLog || (() => {});
  let lastError: Error | null = null;
  let signature: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }

      // Get fresh blockhash for each attempt
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);

      // Sign and send based on transaction type
      if (transaction instanceof Transaction) {
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.sign(...signers);

        signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight,
          preflightCommitment: commitment,
        });
      } else {
        // VersionedTransaction
        transaction.message.recentBlockhash = blockhash;
        transaction.sign(signers);

        signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight,
          preflightCommitment: commitment,
        });
      }

      log(`Transaction sent: ${signature}`);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        commitment
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      log(`Transaction confirmed: ${signature}`);
      return signature;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      log(`Attempt ${attempt + 1} failed: ${lastError.message}`);

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        continue;
      }

      // Non-retryable error or max retries reached
      break;
    }
  }

  // All retries exhausted
  throw new TransactionError(
    `Transaction failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    signature
  );
}

/**
 * Estimate priority fee for a transaction (optional enhancement)
 * Uses Helius priority fee API if available
 * @param connection - Helius connection
 * @returns Recommended priority fee in microlamports
 */
export async function estimatePriorityFee(connection: Connection): Promise<number> {
  try {
    // Get recent prioritization fees
    const fees = await connection.getRecentPrioritizationFees();

    if (fees.length === 0) {
      return 1000; // Default fee
    }

    // Calculate median fee
    const sortedFees = fees
      .map((f) => f.prioritizationFee)
      .sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedFees.length / 2);
    const medianFee = sortedFees[medianIndex];

    // Return slightly above median for faster inclusion
    return Math.max(medianFee * 1.2, 1000);
  } catch {
    // Return default on error
    return 1000;
  }
}
