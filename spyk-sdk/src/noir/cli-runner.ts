/**
 * Noir CLI Runner
 *
 * Executes nargo and sunspot CLI commands for real proof generation.
 * Falls back to mock mode when CLI tools are not available.
 *
 * Requires:
 * - nargo (Noir compiler) - https://noir-lang.org/
 * - sunspot (Solana ZK prover) - https://github.com/reilabs/sunspot
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

// ============================================
// Types
// ============================================

/**
 * Configuration for CLI runner
 */
export interface CLIRunnerConfig {
  /** Path to nargo binary (default: 'nargo') */
  nargoPath?: string;
  /** Path to sunspot binary (default: 'sunspot') */
  sunspotPath?: string;
  /** Path to circuit directory containing Nargo.toml */
  circuitDir: string;
  /** Command timeout in milliseconds (default: 120000 = 2 min) */
  timeout?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Result of proof generation
 */
export interface ProofResult {
  /** Raw proof bytes */
  proof: Buffer;
  /** Public witness bytes */
  publicWitness: Buffer;
}

/**
 * Toolchain status
 */
export interface ToolchainStatus {
  nargo: {
    installed: boolean;
    version?: string;
    path?: string;
  };
  sunspot: {
    installed: boolean;
    version?: string;
    path?: string;
  };
  ready: boolean;
}

// ============================================
// NoirCLIRunner Class
// ============================================

/**
 * CLI runner for nargo and sunspot commands
 *
 * This class shells out to the actual CLI tools for real proof generation.
 * When CLI tools are not available, callers should fall back to mock mode.
 *
 * @example
 * ```typescript
 * const runner = new NoirCLIRunner({
 *   circuitDir: '/path/to/smt_exclusion',
 * });
 *
 * // Check if toolchain is ready
 * const status = await runner.checkToolchain();
 * if (!status.ready) {
 *   console.log('Using mock mode - CLI tools not installed');
 *   return;
 * }
 *
 * // Compile and generate proof
 * await runner.compile();
 * const witnessPath = await runner.execute({ smt_root: '0x...', ... });
 * const { proofPath, publicWitnessPath } = await runner.prove(witnessPath);
 * ```
 */
export class NoirCLIRunner {
  private readonly config: Required<CLIRunnerConfig>;
  private readonly circuitName: string;

  constructor(config: CLIRunnerConfig) {
    // Auto-detect tool paths if not specified
    const defaultNargoPath = process.env.HOME
      ? `${process.env.HOME}/.nargo/bin/nargo`
      : 'nargo';
    const defaultSunspotPath = process.env.HOME
      ? `${process.env.HOME}/sunspot/go/sunspot`
      : 'sunspot';

    this.config = {
      nargoPath: config.nargoPath || defaultNargoPath,
      sunspotPath: config.sunspotPath || defaultSunspotPath,
      circuitDir: config.circuitDir,
      timeout: config.timeout || 120000,
      verbose: config.verbose || false,
    };

    // Extract circuit name from Nargo.toml or directory name
    this.circuitName = this.getCircuitName();
  }

  // ============================================
  // Toolchain Check Methods
  // ============================================

  /**
   * Check if nargo is installed and accessible
   */
  async checkNargo(): Promise<{ installed: boolean; version?: string; path?: string }> {
    // Try multiple paths
    const nargoPaths = [
      this.config.nargoPath,
      `${process.env.HOME}/.nargo/bin/nargo`,
      '/Users/ammar.robb/.nargo/bin/nargo',
      'nargo',
    ];

    for (const nargoPath of nargoPaths) {
      try {
        const { stdout } = await execAsync(`"${nargoPath}" --version`, {
          timeout: 10000,
        });
        const version = stdout.trim();

        // Update config with working path
        (this.config as any).nargoPath = nargoPath;

        return {
          installed: true,
          version,
          path: nargoPath,
        };
      } catch {
        // Try next path
      }
    }

    return { installed: false };
  }

  /**
   * Check if sunspot is installed and accessible
   */
  async checkSunspot(): Promise<{ installed: boolean; version?: string; path?: string }> {
    // sunspot doesn't have --version, use --help instead
    const sunspotPaths = [
      this.config.sunspotPath,
      `${process.env.HOME}/sunspot/go/sunspot`,
      '/Users/ammar.robb/sunspot/go/sunspot',
    ];

    for (const sunspotPath of sunspotPaths) {
      try {
        const { stdout } = await execAsync(`"${sunspotPath}" --help`, {
          timeout: 10000,
        });

        // Extract version-like info from help output
        const version = stdout.includes('Sunspot') ? 'installed (from --help)' : 'unknown';

        return {
          installed: true,
          version,
          path: sunspotPath,
        };
      } catch {
        // Try next path
      }
    }

    return { installed: false };
  }

  /**
   * Check complete toolchain status
   */
  async checkToolchain(): Promise<ToolchainStatus> {
    const [nargo, sunspot] = await Promise.all([
      this.checkNargo(),
      this.checkSunspot(),
    ]);

    return {
      nargo,
      sunspot,
      ready: nargo.installed && sunspot.installed,
    };
  }

  // ============================================
  // Compilation & Execution Methods
  // ============================================

  /**
   * Compile the Noir circuit
   * Runs: nargo compile
   */
  async compile(): Promise<void> {
    this.log('Compiling circuit...');

    try {
      await execAsync(`${this.config.nargoPath} compile`, {
        cwd: this.config.circuitDir,
        timeout: this.config.timeout,
      });
      this.log('Compilation successful');
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Compilation failed: ${err.stderr || err.message}`);
    }
  }

  /**
   * Execute circuit with inputs to generate witness
   * Runs: nargo execute
   *
   * @param proverToml - Circuit inputs as key-value pairs
   * @returns Path to generated witness file
   */
  async execute(proverToml: Record<string, unknown>): Promise<string> {
    this.log('Generating witness...');

    // Write Prover.toml
    const proverTomlPath = path.join(this.config.circuitDir, 'Prover.toml');
    const tomlContent = this.formatProverToml(proverToml);
    fs.writeFileSync(proverTomlPath, tomlContent);
    this.log(`Wrote Prover.toml: ${proverTomlPath}`);

    try {
      await execAsync(`${this.config.nargoPath} execute`, {
        cwd: this.config.circuitDir,
        timeout: this.config.timeout,
      });

      const witnessPath = path.join(this.getTargetDir(), `${this.circuitName}.gz`);

      if (!fs.existsSync(witnessPath)) {
        throw new Error(`Witness file not found: ${witnessPath}`);
      }

      this.log(`Generated witness: ${witnessPath}`);
      return witnessPath;
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Witness generation failed: ${err.stderr || err.message}`);
    }
  }

  /**
   * Generate Groth16 proof using sunspot
   * Runs: sunspot prove <acir> <witness> <ccs> <pk>
   *
   * @param witnessPath - Path to witness file (optional, uses default if not provided)
   * @returns Paths to proof and public witness files
   */
  async prove(witnessPath?: string): Promise<{ proofPath: string; publicWitnessPath: string }> {
    this.log('Generating proof...');

    const acirPath = this.getAcirPath();
    const witness = witnessPath || this.getWitnessPath();
    const ccsPath = this.getCcsPath();
    const pkPath = this.getProvingKeyPath();

    // Verify all required files exist
    for (const [name, filePath] of [
      ['ACIR', acirPath],
      ['Witness', witness],
      ['CCS', ccsPath],
      ['Proving Key', pkPath],
    ]) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${name} file not found: ${filePath}`);
      }
    }

    try {
      await execAsync(
        `${this.config.sunspotPath} prove "${acirPath}" "${witness}" "${ccsPath}" "${pkPath}"`,
        {
          cwd: this.config.circuitDir,
          timeout: this.config.timeout,
        }
      );

      const proofPath = this.getProofPath();
      const publicWitnessPath = this.getPublicWitnessPath();

      if (!fs.existsSync(proofPath)) {
        throw new Error(`Proof file not generated: ${proofPath}`);
      }

      this.log(`Generated proof: ${proofPath}`);
      this.log(`Generated public witness: ${publicWitnessPath}`);

      return { proofPath, publicWitnessPath };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Proof generation failed: ${err.stderr || err.message}`);
    }
  }

  /**
   * Verify proof locally using sunspot
   * Runs: sunspot verify <vk> <proof> <pw>
   *
   * @param proofPath - Path to proof file (optional, uses default)
   * @param publicWitnessPath - Path to public witness (optional, uses default)
   * @returns Whether verification passed
   */
  async verifyLocal(proofPath?: string, publicWitnessPath?: string): Promise<boolean> {
    this.log('Verifying proof locally...');

    const vkPath = this.getVerifyingKeyPath();
    const proof = proofPath || this.getProofPath();
    const pw = publicWitnessPath || this.getPublicWitnessPath();

    // Verify all required files exist
    for (const [name, filePath] of [
      ['Verifying Key', vkPath],
      ['Proof', proof],
      ['Public Witness', pw],
    ]) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${name} file not found: ${filePath}`);
      }
    }

    try {
      await execAsync(
        `${this.config.sunspotPath} verify "${vkPath}" "${proof}" "${pw}"`,
        {
          cwd: this.config.circuitDir,
          timeout: this.config.timeout,
        }
      );
      this.log('Local verification passed');
      return true;
    } catch (error) {
      const err = error as Error & { stderr?: string };
      this.log(`Local verification failed: ${err.stderr || err.message}`);
      return false;
    }
  }

  // ============================================
  // File Reading Methods
  // ============================================

  /**
   * Read proof files and return as buffers
   */
  readProofFiles(): ProofResult {
    const proofPath = this.getProofPath();
    const publicWitnessPath = this.getPublicWitnessPath();

    if (!fs.existsSync(proofPath)) {
      throw new Error(`Proof file not found: ${proofPath}`);
    }
    if (!fs.existsSync(publicWitnessPath)) {
      throw new Error(`Public witness file not found: ${publicWitnessPath}`);
    }

    return {
      proof: fs.readFileSync(proofPath),
      publicWitness: fs.readFileSync(publicWitnessPath),
    };
  }

  /**
   * Create instruction data from proof result
   * Format: proof || publicWitness
   */
  createInstructionData(proofResult: ProofResult): Buffer {
    return Buffer.concat([proofResult.proof, proofResult.publicWitness]);
  }

  // ============================================
  // Path Helpers
  // ============================================

  private getTargetDir(): string {
    return path.join(this.config.circuitDir, 'target');
  }

  private getAcirPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.json`);
  }

  private getWitnessPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.gz`);
  }

  private getCcsPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.ccs`);
  }

  private getProvingKeyPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.pk`);
  }

  private getVerifyingKeyPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.vk`);
  }

  private getProofPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.proof`);
  }

  private getPublicWitnessPath(): string {
    return path.join(this.getTargetDir(), `${this.circuitName}.pw`);
  }

  private getCircuitName(): string {
    // Try to read from Nargo.toml
    const nargoTomlPath = path.join(this.config.circuitDir, 'Nargo.toml');
    if (fs.existsSync(nargoTomlPath)) {
      const content = fs.readFileSync(nargoTomlPath, 'utf-8');
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) {
        return match[1];
      }
    }
    // Fall back to directory name
    return path.basename(this.config.circuitDir);
  }

  // ============================================
  // Utility Methods
  // ============================================

  private formatProverToml(inputs: Record<string, unknown>): string {
    const lines: string[] = ['# Generated by Spyk SDK CLI Runner\n'];

    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'number') {
          // Byte array (numbers)
          lines.push(`${key} = ${this.formatByteArray(value as number[])}`);
        } else {
          // String array (field elements)
          lines.push(`${key} = ${this.formatStringArray(value as string[])}`);
        }
      } else {
        lines.push(`${key} = "${value}"`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private formatByteArray(bytes: number[]): string {
    const lines: string[] = [];
    for (let i = 0; i < bytes.length; i += 8) {
      const chunk = bytes.slice(i, i + 8);
      lines.push(
        '    ' + chunk.map((b) => `0x${b.toString(16).padStart(2, '0')}`).join(', ')
      );
    }
    return '[\n' + lines.join(',\n') + '\n]';
  }

  private formatStringArray(values: string[]): string {
    const lines: string[] = [];
    for (let i = 0; i < values.length; i += 10) {
      const chunk = values.slice(i, i + 10);
      lines.push('    ' + chunk.map((f) => `"${f}"`).join(', '));
    }
    return '[\n' + lines.join(',\n') + '\n]';
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[NoirCLI] ${message}`);
    }
  }

  // ============================================
  // Getters
  // ============================================

  get circuitDirectory(): string {
    return this.config.circuitDir;
  }

  get circuit(): string {
    return this.circuitName;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if Noir toolchain is installed
 *
 * @returns Toolchain status including versions
 *
 * @example
 * ```typescript
 * const status = await checkNoirToolchain();
 * if (status.ready) {
 *   console.log(`nargo: ${status.nargo.version}`);
 *   console.log(`sunspot: ${status.sunspot.version}`);
 * } else {
 *   console.log('Toolchain not installed, using mock mode');
 * }
 * ```
 */
export async function checkNoirToolchain(config?: {
  nargoPath?: string;
  sunspotPath?: string;
}): Promise<ToolchainStatus> {
  // Try multiple paths for each tool
  const nargoPaths = [
    config?.nargoPath,
    `${process.env.HOME}/.nargo/bin/nargo`,
    '/Users/ammar.robb/.nargo/bin/nargo',
    'nargo',
  ].filter(Boolean) as string[];

  const sunspotPaths = [
    config?.sunspotPath,
    `${process.env.HOME}/sunspot/go/sunspot`,
    '/Users/ammar.robb/sunspot/go/sunspot',
    'sunspot',
  ].filter(Boolean) as string[];

  const checkNargo = async (): Promise<{ installed: boolean; version?: string; path?: string }> => {
    for (const nargoPath of nargoPaths) {
      try {
        const { stdout } = await execAsync(`"${nargoPath}" --version`, { timeout: 10000 });
        return { installed: true, version: stdout.trim(), path: nargoPath };
      } catch {
        // Try next path
      }
    }
    return { installed: false };
  };

  const checkSunspot = async (): Promise<{ installed: boolean; version?: string; path?: string }> => {
    for (const sunspotPath of sunspotPaths) {
      try {
        // sunspot uses --help, not --version
        const { stdout } = await execAsync(`"${sunspotPath}" --help`, { timeout: 10000 });
        const version = stdout.includes('Sunspot') ? 'installed' : 'unknown';
        return { installed: true, version, path: sunspotPath };
      } catch {
        // Try next path
      }
    }
    return { installed: false };
  };

  const [nargo, sunspot] = await Promise.all([checkNargo(), checkSunspot()]);

  return {
    nargo,
    sunspot,
    ready: nargo.installed && sunspot.installed,
  };
}

/**
 * Create a CLI runner with sensible defaults
 *
 * @param circuitDir - Path to circuit directory
 * @param options - Additional options
 * @returns Configured NoirCLIRunner
 */
export function createCLIRunner(
  circuitDir: string,
  options?: Partial<Omit<CLIRunnerConfig, 'circuitDir'>>
): NoirCLIRunner {
  return new NoirCLIRunner({
    circuitDir,
    ...options,
  });
}

/**
 * Get the default circuit directory for smt_exclusion
 * Searches common locations relative to the SDK
 */
export function getDefaultCircuitDir(): string | null {
  // Try env var first
  if (process.env.CIRCUIT_DIR && fs.existsSync(path.join(process.env.CIRCUIT_DIR, 'Nargo.toml'))) {
    return process.env.CIRCUIT_DIR;
  }

  // Get directory name in ESM-compatible way
  let dirname: string;
  try {
    // Try __dirname for CommonJS
    dirname = __dirname;
  } catch {
    // ESM fallback - use current file URL
    try {
      dirname = path.dirname(new URL(import.meta.url).pathname);
    } catch {
      // Ultimate fallback
      dirname = process.cwd();
    }
  }

  const searchPaths = [
    // Relative to SDK dist
    path.join(dirname, '../../circuits/smt_exclusion'),
    path.join(dirname, '../../../circuits/smt_exclusion'),
    // noir-examples in workspace (from dist)
    path.join(dirname, '../../../noir-examples/circuits/smt_exclusion'),
    path.join(dirname, '../../../../noir-examples/circuits/smt_exclusion'),
    // Absolute paths for monorepo
    path.join(dirname, '../../noir-examples/circuits/smt_exclusion'),
    // From spyk-sdk root
    path.resolve(dirname, '../../../noir-examples/circuits/smt_exclusion'),
    // Common workspace locations
    process.cwd() + '/noir-examples/circuits/smt_exclusion',
    process.cwd() + '/../noir-examples/circuits/smt_exclusion',
    // Absolute fallback for known monorepo structure
    process.env.HOME + '/Documents/Web3/Spyk Protocol/noir-examples/circuits/smt_exclusion',
  ];

  for (const searchPath of searchPaths) {
    const resolved = path.resolve(searchPath);
    if (fs.existsSync(path.join(resolved, 'Nargo.toml'))) {
      return resolved;
    }
  }

  return null;
}
