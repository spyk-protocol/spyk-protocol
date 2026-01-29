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
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * // Create prover
 * const prover = noir.createNoirProver();
 *
 * // Generate compliance proof
 * const result = await prover.proveCompliance(address);
 * if (result.passed && result.noirProof) {
 *   // Verify on-chain
 *   const verifier = noir.createNoirVerifier(connection, wallet, {
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
