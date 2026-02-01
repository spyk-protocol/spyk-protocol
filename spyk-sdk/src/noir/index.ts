/**
 * Noir/Sunspot Integration Module
 *
 * Aztec Noir ZK proofs for OFAC/sanctions compliance via Sunspot SDK.
 *
 * This module provides:
 * - smt_exclusion circuit for non-membership proofs
 * - Proof generation via Sunspot prover (CLI or mock mode)
 * - On-chain verification via CPI to ZK verifier
 * - CLI runner for direct nargo/sunspot interaction
 *
 * ## Modes
 *
 * The prover supports two modes:
 * - **CLI mode**: Uses real nargo and sunspot binaries for cryptographically
 *   valid Groth16 proofs. Requires nargo and sunspot to be installed.
 * - **Mock mode**: Generates structurally correct but mock proofs for
 *   development and demos. No CLI tools required.
 *
 * The prover auto-detects CLI tools and falls back to mock mode if not available.
 *
 * @example
 * ```typescript
 * import { noir } from '@spyk-protocol/sdk';
 *
 * // Check toolchain status
 * const status = await noir.checkToolchain();
 * console.log('CLI mode available:', status.ready);
 *
 * // Create prover (auto-detects mode)
 * const prover = noir.createNoirProver();
 *
 * // Generate compliance proof
 * const result = await prover.proveCompliance(address);
 * if (result.passed && result.noirProof) {
 *   console.log('Mode:', prover.getMode()); // 'cli' or 'mock'
 *
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

// CLI Runner
export {
  NoirCLIRunner,
  checkNoirToolchain,
  createCLIRunner,
  getDefaultCircuitDir,
  type CLIRunnerConfig,
  type ProofResult,
  type ToolchainStatus,
} from './cli-runner';

// Sunspot client
export {
  SunspotClient,
  SUNSPOT_DEFAULTS,
  type SunspotClientConfig,
} from './sunspot';

// Prover
export {
  NoirProver,
  createNoirProver,
  checkToolchain,
  type NoirProverExtendedConfig,
} from './prover';

// Verifier
export {
  NoirVerifier,
  createNoirVerifier,
  buildVerifyInstruction,
  getDefaultVerifierProgramId,
  VERIFIER_DEFAULTS,
  // Mock verifier for demos
  MockNoirVerifier,
  createMockNoirVerifier,
  createAutoVerifier,
} from './verifier';
