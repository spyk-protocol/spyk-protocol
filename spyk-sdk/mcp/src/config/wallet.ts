import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import 'dotenv/config';

export interface WalletConfig {
  keypair: Keypair;
  connection: Connection;
  network: 'devnet' | 'mainnet-beta';
  publicKey: string;
}

/**
 * Expand ~ to home directory
 */
function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return resolve(homedir(), filePath.slice(2));
  }
  return resolve(filePath);
}

/**
 * Load keypair from file (Solana CLI format - JSON array of bytes)
 */
function loadKeypairFromFile(filePath: string): Keypair {
  const expandedPath = expandPath(filePath);
  if (!existsSync(expandedPath)) {
    throw new Error(`Keypair file not found: ${expandedPath}`);
  }

  const fileContent = readFileSync(expandedPath, 'utf-8');
  const secretKey = new Uint8Array(JSON.parse(fileContent));
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Load keypair from base58-encoded private key
 */
function loadKeypairFromBase58(privateKey: string): Keypair {
  const secretKey = bs58.decode(privateKey);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Load wallet configuration from environment variables
 *
 * Supports two methods:
 * 1. SPYK_PRIVATE_KEY - base58-encoded private key
 * 2. SPYK_KEYPAIR_PATH - path to Solana CLI keypair file
 *
 * Priority: SPYK_PRIVATE_KEY > SPYK_KEYPAIR_PATH > default path
 */
export function loadWalletConfig(): WalletConfig {
  const privateKey = process.env.SPYK_PRIVATE_KEY;
  const keypairPath = process.env.SPYK_KEYPAIR_PATH;
  const network = (process.env.SPYK_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';

  let keypair: Keypair;

  if (privateKey) {
    try {
      keypair = loadKeypairFromBase58(privateKey);
    } catch (error) {
      throw new Error('Invalid SPYK_PRIVATE_KEY: must be base58-encoded secret key');
    }
  } else if (keypairPath) {
    try {
      keypair = loadKeypairFromFile(keypairPath);
    } catch (error) {
      throw new Error(`Failed to load keypair from ${keypairPath}: ${error}`);
    }
  } else {
    // Try default Solana CLI path
    const defaultPath = '~/.config/solana/id.json';
    try {
      keypair = loadKeypairFromFile(defaultPath);
      console.error(`[SPYK] Using default keypair from ${defaultPath}`);
    } catch {
      throw new Error(
        'No wallet configured. Set SPYK_PRIVATE_KEY or SPYK_KEYPAIR_PATH environment variable.'
      );
    }
  }

  const rpcUrl = process.env.SPYK_RPC_URL || clusterApiUrl(network);
  const connection = new Connection(rpcUrl, 'confirmed');

  return {
    keypair,
    connection,
    network,
    publicKey: keypair.publicKey.toBase58(),
  };
}
