/**
 * Noir/Sunspot Integration Module
 *
 * Aztec Noir ZK proofs for OFAC/sanctions compliance via Sunspot SDK.
 *
 * This module provides:
 * - smt_exclusion circuit for non-membership proofs
 * - Proof generation via Sunspot prover
 * - On-chain verification via CPI to ZK verifier
 *
 * WARNING: This is EXPERIMENTAL and NOT AUDITED.
 * Enable only with { experimental: { noirProofs: true } }
 *
 * @example
 * ```typescript
 * import { Spyk } from '@spyk/sdk';
 * import { createNoirProver, createNoirVerifier } from '@spyk/sdk/experimental/noir';
 *
 * // Enable experimental features
 * const config = {
 *   experimental: { noirProofs: true }
 * };
 *
 * // Create prover
 * const prover = createNoirProver(config.experimental);
 *
 * // Generate compliance proof
 * const result = await prover.proveCompliance(address);
 * if (result.passed && result.noirProof) {
 *   // Verify on-chain
 *   const verifier = createNoirVerifier(config.experimental, connection, wallet, {
 *     verifierProgramId: VERIFIER_PROGRAM_ID
 *   });
 *   const verification = await verifier.verifyOnChain(result.noirProof);
 * }
 * ```
 */

// Types
export * from './types';

// Sunspot client
export { SunspotClient, SUNSPOT_DEFAULTS } from './sunspot';

// Prover
export { NoirProver, createNoirProver } from './prover';

// Verifier
export {
  NoirVerifier,
  createNoirVerifier,
  buildVerifyInstruction,
  getDefaultVerifierProgramId,
  VERIFIER_DEFAULTS,
} from './verifier';
