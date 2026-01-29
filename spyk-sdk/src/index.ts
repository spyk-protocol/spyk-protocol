/**
 * Spyk Protocol SDK
 * Privacy-preserving transactions on Solana
 */

// Configuration
export {
  getConfig,
  getHeliusRpcUrl,
  createConnection,
  type SpykConfig,
  type RpcProvider,
} from './config';

// Types
export * from './types';

// Utilities
export * from './utils';

// Unified SDK
export { Spyk, type AggregatedBalances } from './spyk';

// Protocol Wrappers
export { SpykPrivacyCash } from './privacy-cash';
export { SpykShadowWire, type TransferParams } from './shadowwire';

// x402 Integration
export * from './x402';

// Compliance Module (OPT-IN only)
export * from './compliance';

// Noir/Sunspot Integration - ZK Proofs on Solana
export * as noir from './noir';

// Arcium Integration - Encrypted DeFi Operations
// Provides private swaps, confidential lending, and encrypted state management
export {
  SpykArcium,
  createSpykArcium,
  ArciumClient,
  createArciumClient,
  PrivateSwap,
  createPrivateSwap,
  PrivateLending,
  createPrivateLending,
  EncryptedStateManager,
  createEncryptedStateManager,
  TOKEN_MINTS,
  type SpykArciumConfig,
  type ArciumEnvConfig,
  type EncryptionContext,
  type EncryptedValue,
  type ComputationResult,
  type ComputationStatus,
  type PrivateSwapParams,
  type PrivateSwapResult,
  type PrivateLendingDepositParams,
  type PrivateLendingBorrowParams,
  type LendingResult,
  ArciumError,
  ArciumErrorCodes,
} from './arcium';
