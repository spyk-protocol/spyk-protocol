/**
 * Noir/Sunspot ZK Proof Tests
 *
 * Tests for Noir proof generation and verification using Sunspot.
 * Includes tests for both CLI mode (when tools available) and mock mode.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import {
  createNoirProver,
  createNoirVerifier,
  createMockNoirVerifier,
  createAutoVerifier,
  SunspotClient,
  SUNSPOT_DEFAULTS,
  VERIFIER_DEFAULTS,
  NoirProver,
  NoirVerifier,
  MockNoirVerifier,
  NoirProof,
  NoirError,
  NoirErrorCodes,
  // CLI-related exports
  NoirCLIRunner,
  checkNoirToolchain,
  checkToolchain,
  createCLIRunner,
  getDefaultCircuitDir,
  ToolchainStatus,
} from '../src/noir';

describe('Noir/Sunspot Integration', () => {
  describe('SUNSPOT_DEFAULTS', () => {
    it('should have correct devnet endpoint', () => {
      expect(SUNSPOT_DEFAULTS.ENDPOINT).toBe('https://sunspot-devnet.reilabs.io');
    });

    it('should have correct circuit configuration', () => {
      expect(SUNSPOT_DEFAULTS.SMT_EXCLUSION_CIRCUIT).toBe('smt_exclusion');
      expect(SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES).toBe(388);
      expect(SUNSPOT_DEFAULTS.NOIR_VERSION).toBe('1.0.0-beta.18');
    });

    it('should have tree service endpoint', () => {
      expect(SUNSPOT_DEFAULTS.TREE_SERVICE).toBe('https://tree-service.spyk.dev');
    });

    it('should have default cache TTL', () => {
      expect(SUNSPOT_DEFAULTS.CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('SunspotClient', () => {
    let client: SunspotClient;

    beforeEach(() => {
      // Force mock mode for consistent tests
      client = new SunspotClient({ useCLI: false });
    });

    describe('constructor', () => {
      it('should create with default config', () => {
        expect(client).toBeDefined();
      });

      it('should accept custom endpoint', () => {
        const customClient = new SunspotClient({
          sunspotEndpoint: 'https://custom.endpoint.io',
          useCLI: false,
        });
        expect(customClient).toBeDefined();
      });

      it('should accept custom tree service endpoint', () => {
        const customClient = new SunspotClient({
          treeServiceEndpoint: 'https://custom-tree.example.com',
          useCLI: false,
        });
        expect(customClient).toBeDefined();
      });

      it('should accept useCLI option', () => {
        const mockClient = new SunspotClient({ useCLI: false });
        expect(mockClient).toBeDefined();
      });
    });

    describe('initialize', () => {
      it('should initialize successfully in mock mode', async () => {
        await expect(client.initialize()).resolves.not.toThrow();
        expect(client.getMode()).toBe('mock');
      });

      it('should be idempotent', async () => {
        await client.initialize();
        await expect(client.initialize()).resolves.not.toThrow();
      });
    });

    describe('getOFACTree', () => {
      it('should return tree with expected structure', async () => {
        const tree = await client.getOFACTree();

        expect(tree).toHaveProperty('root');
        expect(tree).toHaveProperty('depth');
        expect(tree).toHaveProperty('version');
        expect(tree.root).toBeInstanceOf(Uint8Array);
        expect(tree.root.length).toBe(32);
        expect(tree.depth).toBe(256);
      });
    });

    describe('generateNonMembershipProof', () => {
      it('should generate proof for valid address', async () => {
        const address = Keypair.generate().publicKey.toBytes();
        const tree = await client.getOFACTree();

        const result = await client.generateNonMembershipProof(address, tree);

        expect(result.success).toBe(true);
        expect(result.proof).toBeDefined();
        expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
      });

      it('should generate proof with correct size', async () => {
        const address = Keypair.generate().publicKey.toBytes();
        const tree = await client.getOFACTree();

        const result = await client.generateNonMembershipProof(address, tree);

        expect(result.proof?.proof.length).toBe(SUNSPOT_DEFAULTS.PROOF_SIZE_BYTES);
      });

      it('should include correct public inputs', async () => {
        const address = Keypair.generate().publicKey.toBytes();
        const tree = await client.getOFACTree();

        const result = await client.generateNonMembershipProof(address, tree);

        expect(result.proof?.publicInputs.address).toEqual(address);
        expect(result.proof?.publicInputs.root).toEqual(tree.root);
      });

      it('should include metadata', async () => {
        const address = Keypair.generate().publicKey.toBytes();
        const tree = await client.getOFACTree();

        const result = await client.generateNonMembershipProof(address, tree);

        expect(result.proof?.metadata.circuit).toBe('smt_exclusion');
        expect(result.proof?.metadata.noirVersion).toBe('1.0.0-beta.18');
        expect(result.proof?.metadata.size).toBe(388);
        expect(result.proof?.metadata.timestamp).toBeGreaterThan(0);
      });
    });

    describe('verifyProofLocal', () => {
      it('should verify valid proof', async () => {
        const address = Keypair.generate().publicKey.toBytes();
        const tree = await client.getOFACTree();

        const result = await client.generateNonMembershipProof(address, tree);
        const isValid = await client.verifyProofLocal(result.proof!);

        expect(isValid).toBe(true);
      });

      it('should reject proof with wrong size', async () => {
        const invalidProof: NoirProof = {
          proof: new Uint8Array(100), // Wrong size
          publicInputs: {
            address: new Uint8Array(32),
            root: new Uint8Array(32),
          },
          metadata: {
            circuit: 'smt_exclusion',
            noirVersion: '1.0.0-beta.18',
            timestamp: Date.now(),
            size: 100,
          },
        };

        const isValid = await client.verifyProofLocal(invalidProof);
        expect(isValid).toBe(false);
      });

      it('should reject proof with invalid address length', async () => {
        const invalidProof: NoirProof = {
          proof: new Uint8Array(388),
          publicInputs: {
            address: new Uint8Array(20), // Wrong size
            root: new Uint8Array(32),
          },
          metadata: {
            circuit: 'smt_exclusion',
            noirVersion: '1.0.0-beta.18',
            timestamp: Date.now(),
            size: 388,
          },
        };

        const isValid = await client.verifyProofLocal(invalidProof);
        expect(isValid).toBe(false);
      });
    });

    describe('mode detection', () => {
      it('should report mock mode when useCLI is false', async () => {
        await client.initialize();
        expect(client.getMode()).toBe('mock');
        expect(client.isUsingCLI()).toBe(false);
      });

      it('should provide toolchain status', async () => {
        await client.initialize();
        const status = client.getToolchainStatus();
        expect(status).toBeDefined();
        expect(status).toHaveProperty('nargo');
        expect(status).toHaveProperty('sunspot');
        expect(status).toHaveProperty('ready');
      });
    });

    describe('caching', () => {
      it('should cache proofs when enabled', async () => {
        const address = Keypair.generate().publicKey.toBytes();
        const tree = await client.getOFACTree();

        // Generate twice - second should be faster (cached)
        const start1 = Date.now();
        const result1 = await client.generateNonMembershipProof(address, tree);
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        const result2 = await client.generateNonMembershipProof(address, tree);
        const time2 = Date.now() - start2;

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        // Cached call should be faster or at least same
        expect(time2).toBeLessThanOrEqual(time1 + 10); // Allow small variance
      });

      it('should clear cache', () => {
        client.clearCache();
        const stats = client.getCacheStats();
        expect(stats.size).toBe(0);
      });
    });
  });

  describe('NoirProver', () => {
    let prover: NoirProver;

    beforeEach(() => {
      // Force mock mode for consistent tests
      prover = createNoirProver({ useCLI: false });
    });

    describe('constructor', () => {
      it('should create prover with factory function', () => {
        expect(prover).toBeInstanceOf(NoirProver);
      });

      it('should accept custom config', () => {
        const customProver = createNoirProver({
          sunspotEndpoint: 'https://custom.endpoint.io',
          enableCache: false,
          useCLI: false,
        });
        expect(customProver).toBeInstanceOf(NoirProver);
      });
    });

    describe('initialize', () => {
      it('should initialize successfully', async () => {
        await expect(prover.initialize()).resolves.not.toThrow();
      });
    });

    describe('proveCompliance', () => {
      it('should prove compliance for PublicKey', async () => {
        const address = Keypair.generate().publicKey;

        const result = await prover.proveCompliance(address);

        expect(result.passed).toBe(true);
        expect(result.noirProof).toBeDefined();
        expect(result.confidence).toBe(1);
        expect(result.timestamp).toBeGreaterThan(0);
      });

      it('should prove compliance for string address', async () => {
        const address = Keypair.generate().publicKey.toBase58();

        const result = await prover.proveCompliance(address);

        expect(result.passed).toBe(true);
        expect(result.noirProof).toBeDefined();
      });

      it('should return proof with correct structure', async () => {
        const address = Keypair.generate().publicKey;

        const result = await prover.proveCompliance(address);

        expect(result.noirProof?.proof).toBeInstanceOf(Uint8Array);
        expect(result.noirProof?.proof.length).toBe(388);
        expect(result.noirProof?.publicInputs.address.length).toBe(32);
        expect(result.noirProof?.publicInputs.root.length).toBe(32);
      });
    });

    describe('proveComplianceBatch', () => {
      it('should prove compliance for multiple addresses', async () => {
        const addresses = [
          Keypair.generate().publicKey,
          Keypair.generate().publicKey,
          Keypair.generate().publicKey,
        ];

        const results = await prover.proveComplianceBatch(addresses);

        expect(results.length).toBe(3);
        results.forEach((result) => {
          expect(result.passed).toBe(true);
          expect(result.noirProof).toBeDefined();
        });
      });
    });

    describe('getCircuitInfo', () => {
      it('should return circuit information with mode', async () => {
        await prover.initialize();
        const info = prover.getCircuitInfo();

        expect(info.name).toBe('smt_exclusion');
        expect(info.version).toBe('1.0.0-beta.18');
        expect(info.backend).toBe('sunspot');
        expect(info.mode).toBe('mock');
      });
    });

    describe('mode methods', () => {
      it('should report mock mode', async () => {
        await prover.initialize();
        expect(prover.getMode()).toBe('mock');
        expect(prover.isUsingCLI()).toBe(false);
      });

      it('should provide toolchain status', async () => {
        await prover.initialize();
        const status = prover.getToolchainStatus();
        expect(status).toBeDefined();
      });
    });
  });

  describe('NoirVerifier', () => {
    let verifier: NoirVerifier;
    let connection: Connection;
    let payer: Keypair;

    beforeEach(() => {
      connection = new Connection('https://api.devnet.solana.com');
      payer = Keypair.generate();
      verifier = createNoirVerifier(connection, payer, {
        verifierProgramId: VERIFIER_DEFAULTS.DEVNET_PROGRAM_ID,
      });
    });

    describe('constructor', () => {
      it('should create verifier with factory function', () => {
        expect(verifier).toBeInstanceOf(NoirVerifier);
      });

      it('should expose program ID', () => {
        expect(verifier.programId).toEqual(VERIFIER_DEFAULTS.DEVNET_PROGRAM_ID);
      });
    });

    describe('getCpiInstruction', () => {
      it('should build CPI instruction', async () => {
        const prover = createNoirProver({ useCLI: false });
        const address = Keypair.generate().publicKey;
        const result = await prover.proveCompliance(address);

        const ix = verifier.getCpiInstruction(result.noirProof!);

        expect(ix.programId).toEqual(VERIFIER_DEFAULTS.DEVNET_PROGRAM_ID);
        expect(ix.data).toBeInstanceOf(Buffer);
        expect(ix.keys).toEqual([]);
      });

      it('should include proof data in instruction', async () => {
        const prover = createNoirProver({ useCLI: false });
        const address = Keypair.generate().publicKey;
        const result = await prover.proveCompliance(address);

        const ix = verifier.getCpiInstruction(result.noirProof!);

        // Data should be: 8 (discriminator) + 388 (proof) + 32 (address) + 32 (root)
        expect(ix.data.length).toBe(8 + 388 + 32 + 32);
      });
    });

    // Note: verifyOnChain and simulateVerification require actual on-chain program
    // These are mocked tests for devnet demo
    describe('simulateVerification', () => {
      it('should attempt simulation (will fail without deployed program)', async () => {
        const prover = createNoirProver({ useCLI: false });
        const address = Keypair.generate().publicKey;
        const result = await prover.proveCompliance(address);

        // Will fail because program doesn't exist, but should not throw
        const valid = await verifier.simulateVerification(result.noirProof!);
        expect(typeof valid).toBe('boolean');
      });
    });
  });

  describe('VERIFIER_DEFAULTS', () => {
    it('should have devnet program ID', () => {
      expect(VERIFIER_DEFAULTS.DEVNET_PROGRAM_ID).toBeInstanceOf(PublicKey);
    });

    it('should have mainnet program ID', () => {
      expect(VERIFIER_DEFAULTS.MAINNET_PROGRAM_ID).toBeInstanceOf(PublicKey);
    });

    it('should have verify discriminator', () => {
      expect(VERIFIER_DEFAULTS.VERIFY_DISCRIMINATOR).toBeInstanceOf(Buffer);
      expect(VERIFIER_DEFAULTS.VERIFY_DISCRIMINATOR.length).toBe(8);
    });
  });

  describe('NoirError', () => {
    it('should create error with code', () => {
      const error = new NoirError('Test error', NoirErrorCodes.PROOF_GENERATION_FAILED);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('NOIR_PROOF_GENERATION_FAILED');
      expect(error.name).toBe('NoirError');
    });

    it('should include details', () => {
      const details = { foo: 'bar' };
      const error = new NoirError('Test', NoirErrorCodes.NETWORK_ERROR, details);

      expect(error.details).toEqual(details);
    });

    it('should have all error codes defined', () => {
      expect(NoirErrorCodes.FEATURE_DISABLED).toBe('NOIR_FEATURE_DISABLED');
      expect(NoirErrorCodes.PROVER_UNAVAILABLE).toBe('NOIR_PROVER_UNAVAILABLE');
      expect(NoirErrorCodes.TREE_SERVICE_ERROR).toBe('NOIR_TREE_SERVICE_ERROR');
      expect(NoirErrorCodes.PROOF_GENERATION_FAILED).toBe('NOIR_PROOF_GENERATION_FAILED');
      expect(NoirErrorCodes.VERIFICATION_FAILED).toBe('NOIR_VERIFICATION_FAILED');
      expect(NoirErrorCodes.INVALID_PROOF).toBe('NOIR_INVALID_PROOF');
      expect(NoirErrorCodes.ADDRESS_SANCTIONED).toBe('NOIR_ADDRESS_SANCTIONED');
      expect(NoirErrorCodes.NETWORK_ERROR).toBe('NOIR_NETWORK_ERROR');
    });
  });
});

describe('MockNoirVerifier', () => {
  let mockVerifier: MockNoirVerifier;
  let prover: NoirProver;

  beforeEach(() => {
    mockVerifier = createMockNoirVerifier();
    prover = createNoirProver({ useCLI: false });
  });

  describe('constructor', () => {
    it('should create mock verifier with factory function', () => {
      expect(mockVerifier).toBeInstanceOf(MockNoirVerifier);
    });

    it('should have mock program ID (System Program)', () => {
      // Mock verifier uses System Program as a placeholder since it never actually calls it
      expect(mockVerifier.programId.toBase58()).toBe('11111111111111111111111111111111');
    });
  });

  describe('verifyOnChain', () => {
    it('should verify valid proof locally', async () => {
      const address = Keypair.generate().publicKey;
      const result = await prover.proveCompliance(address);

      const verification = await mockVerifier.verifyOnChain(result.noirProof!);

      expect(verification.verified).toBe(true);
      expect(verification.signature).toBeDefined();
      expect(verification.signature).toContain('mock_');
      expect(verification.timestamp).toBeGreaterThan(0);
    });

    it('should reject proof with wrong size', async () => {
      const invalidProof: NoirProof = {
        proof: new Uint8Array(100), // Wrong size
        publicInputs: {
          address: new Uint8Array(32).fill(1),
          root: new Uint8Array(32).fill(2),
        },
        metadata: {
          circuit: 'smt_exclusion',
          noirVersion: '1.0.0-beta.18',
          timestamp: Date.now(),
          size: 100,
        },
      };

      const verification = await mockVerifier.verifyOnChain(invalidProof);
      expect(verification.verified).toBe(false);
      expect(verification.error).toBeDefined();
    });

    it('should reject empty proof', async () => {
      const emptyProof: NoirProof = {
        proof: new Uint8Array(388).fill(0), // All zeros
        publicInputs: {
          address: new Uint8Array(32).fill(1),
          root: new Uint8Array(32).fill(2),
        },
        metadata: {
          circuit: 'smt_exclusion',
          noirVersion: '1.0.0-beta.18',
          timestamp: Date.now(),
          size: 388,
        },
      };

      const verification = await mockVerifier.verifyOnChain(emptyProof);
      expect(verification.verified).toBe(false);
    });

    it('should reject proof with empty address', async () => {
      const proof: NoirProof = {
        proof: new Uint8Array(388).fill(1),
        publicInputs: {
          address: new Uint8Array(32).fill(0), // All zeros
          root: new Uint8Array(32).fill(2),
        },
        metadata: {
          circuit: 'smt_exclusion',
          noirVersion: '1.0.0-beta.18',
          timestamp: Date.now(),
          size: 388,
        },
      };

      const verification = await mockVerifier.verifyOnChain(proof);
      expect(verification.verified).toBe(false);
    });
  });

  describe('simulateVerification', () => {
    it('should return true for valid proof', async () => {
      const address = Keypair.generate().publicKey;
      const result = await prover.proveCompliance(address);

      const isValid = await mockVerifier.simulateVerification(result.noirProof!);
      expect(isValid).toBe(true);
    });
  });

  describe('getCpiInstruction', () => {
    it('should build instruction with mock program ID', async () => {
      const address = Keypair.generate().publicKey;
      const result = await prover.proveCompliance(address);

      const ix = mockVerifier.getCpiInstruction(result.noirProof!);

      expect(ix.programId).toEqual(mockVerifier.programId);
      expect(ix.data.length).toBe(8 + 388 + 32 + 32);
    });
  });
});

describe('createAutoVerifier', () => {
  it('should create real verifier when program is deployed on devnet', async () => {
    const connection = new Connection('https://api.devnet.solana.com');
    const payer = Keypair.generate();

    const verifier = await createAutoVerifier(connection, payer, { network: 'devnet' });

    // Should return real verifier since MOCK_MODE_ENABLED is false and program is deployed
    // The program 548u4SFWZMaRWZQqdyAgm66z7VRYtNHHF2sr7JTBXbwN is deployed on devnet
    expect(verifier).toBeInstanceOf(NoirVerifier);
  });

  it('should create mock verifier when forceMock is true', async () => {
    const connection = new Connection('https://api.devnet.solana.com');
    const payer = Keypair.generate();

    const verifier = await createAutoVerifier(connection, payer, { forceMock: true });

    expect(verifier).toBeInstanceOf(MockNoirVerifier);
  });
});

describe('CLI Runner', () => {
  describe('checkNoirToolchain', () => {
    it('should return toolchain status', async () => {
      const status = await checkNoirToolchain();

      expect(status).toHaveProperty('nargo');
      expect(status).toHaveProperty('sunspot');
      expect(status).toHaveProperty('ready');
      expect(typeof status.nargo.installed).toBe('boolean');
      expect(typeof status.sunspot.installed).toBe('boolean');
      expect(typeof status.ready).toBe('boolean');
    });

    it('should return version if tools are installed', async () => {
      const status = await checkNoirToolchain();

      if (status.nargo.installed) {
        expect(status.nargo.version).toBeDefined();
        expect(typeof status.nargo.version).toBe('string');
      }

      if (status.sunspot.installed) {
        expect(status.sunspot.version).toBeDefined();
        expect(typeof status.sunspot.version).toBe('string');
      }
    });
  });

  describe('checkToolchain (exported from prover)', () => {
    it('should be same as checkNoirToolchain', async () => {
      const status1 = await checkNoirToolchain();
      const status2 = await checkToolchain();

      expect(status1.nargo.installed).toBe(status2.nargo.installed);
      expect(status1.sunspot.installed).toBe(status2.sunspot.installed);
      expect(status1.ready).toBe(status2.ready);
    });
  });

  describe('getDefaultCircuitDir', () => {
    it('should return string or null', () => {
      const circuitDir = getDefaultCircuitDir();
      expect(circuitDir === null || typeof circuitDir === 'string').toBe(true);
    });
  });

  describe('NoirCLIRunner', () => {
    it('should be constructible with config', () => {
      const runner = new NoirCLIRunner({
        circuitDir: '/tmp/test-circuit',
      });
      expect(runner).toBeInstanceOf(NoirCLIRunner);
      expect(runner.circuitDirectory).toBe('/tmp/test-circuit');
    });

    it('should expose circuit name', () => {
      const runner = new NoirCLIRunner({
        circuitDir: '/tmp/smt_exclusion',
      });
      // Falls back to directory name if Nargo.toml not found
      expect(runner.circuit).toBe('smt_exclusion');
    });
  });

  describe('createCLIRunner', () => {
    it('should create runner with factory function', () => {
      const runner = createCLIRunner('/tmp/test-circuit');
      expect(runner).toBeInstanceOf(NoirCLIRunner);
    });

    it('should accept options', () => {
      const runner = createCLIRunner('/tmp/test-circuit', {
        verbose: true,
        timeout: 60000,
      });
      expect(runner).toBeInstanceOf(NoirCLIRunner);
    });
  });
});

describe('CLI Mode Integration', () => {
  // These tests check behavior when CLI mode is requested but may not be available
  describe('forcing CLI mode', () => {
    it('should throw if CLI mode forced but tools not installed', async () => {
      // Only run this test if tools are NOT installed
      const status = await checkNoirToolchain();
      if (status.ready) {
        // Skip test - tools are installed
        return;
      }

      const client = new SunspotClient({ useCLI: true });
      await expect(client.initialize()).rejects.toThrow(NoirError);
    });

    it('should work in mock mode regardless of toolchain', async () => {
      const client = new SunspotClient({ useCLI: false });
      await expect(client.initialize()).resolves.not.toThrow();
      expect(client.getMode()).toBe('mock');
    });
  });

  describe('auto-detection', () => {
    it('should auto-detect mode based on toolchain', async () => {
      const status = await checkNoirToolchain();
      const client = new SunspotClient(); // useCLI: 'auto' (default)
      await client.initialize();

      // If tools are installed, should use CLI mode
      // Otherwise, should fall back to mock mode
      if (status.ready) {
        // Tools are installed - but may still use mock if circuit dir not found
        expect(['cli', 'mock']).toContain(client.getMode());
      } else {
        expect(client.getMode()).toBe('mock');
      }
    });
  });
});

describe('Devnet Demo Compatibility', () => {
  it('should work completely offline for demo', async () => {
    // This test verifies the mock implementation works without network
    const prover = createNoirProver({ useCLI: false });
    const address = Keypair.generate().publicKey;

    const result = await prover.proveCompliance(address);

    expect(result.passed).toBe(true);
    expect(result.noirProof).toBeDefined();
    expect(result.noirProof?.proof.length).toBe(388);
  });

  it('should generate deterministic proof structure', async () => {
    const prover = createNoirProver({ useCLI: false });
    const address = Keypair.generate().publicKey;

    const result1 = await prover.proveCompliance(address);
    const result2 = await prover.proveCompliance(address);

    // Both proofs should have same structure (content differs due to random mock)
    expect(result1.noirProof?.proof.length).toBe(result2.noirProof?.proof.length);
    expect(result1.noirProof?.metadata.circuit).toBe(result2.noirProof?.metadata.circuit);
  });

  it('should provide meaningful circuit info for demo', async () => {
    const prover = createNoirProver({ useCLI: false });
    await prover.initialize();
    const info = prover.getCircuitInfo();

    expect(info).toEqual({
      name: 'smt_exclusion',
      version: '1.0.0-beta.18',
      backend: 'sunspot',
      mode: 'mock',
    });
  });
});

describe('End-to-End Demo Flow', () => {
  it('should complete full proof generation and verification flow', async () => {
    // 1. Create prover (mock mode)
    const prover = createNoirProver({ useCLI: false });
    expect(prover).toBeInstanceOf(NoirProver);

    // 2. Generate compliance proof
    const address = Keypair.generate().publicKey;
    const complianceResult = await prover.proveCompliance(address);

    expect(complianceResult.passed).toBe(true);
    expect(complianceResult.noirProof).toBeDefined();
    expect(complianceResult.noirProof!.proof.length).toBe(388);
    expect(complianceResult.confidence).toBe(1);

    // 3. Check mode
    expect(prover.getMode()).toBe('mock');

    // 4. Create mock verifier (for demo without deployed program)
    const verifier = createMockNoirVerifier();
    expect(verifier).toBeInstanceOf(MockNoirVerifier);

    // 5. Verify proof (locally with mock verifier)
    const verification = await verifier.verifyOnChain(complianceResult.noirProof!);

    expect(verification.verified).toBe(true);
    expect(verification.signature).toBeDefined();
    expect(verification.timestamp).toBeGreaterThan(0);

    console.log('\n=== Demo Flow Complete ===');
    console.log(`Address: ${address.toBase58()}`);
    console.log(`Mode: ${prover.getMode()}`);
    console.log(`Proof size: ${complianceResult.noirProof!.proof.length} bytes`);
    console.log(`Verification: ${verification.verified ? 'PASSED' : 'FAILED'}`);
    console.log(`Mock signature: ${verification.signature}`);
  });

  it('should demonstrate batch compliance checking', async () => {
    const prover = createNoirProver({ useCLI: false });
    const verifier = createMockNoirVerifier();

    // Generate multiple addresses
    const addresses = Array.from({ length: 5 }, () => Keypair.generate().publicKey);

    // Batch prove compliance
    const results = await prover.proveComplianceBatch(addresses);

    expect(results.length).toBe(5);
    expect(results.every((r) => r.passed)).toBe(true);

    // Verify all proofs
    const verifications = await Promise.all(
      results.map((r) => verifier.verifyOnChain(r.noirProof!))
    );

    expect(verifications.every((v) => v.verified)).toBe(true);

    console.log(`\nBatch verified ${verifications.length} addresses`);
  });
});

// Conditional CLI tests - only run if tools are available
describe('Real CLI Integration (skip if tools not installed)', () => {
  let toolchainReady = false;

  beforeEach(async () => {
    const status = await checkNoirToolchain();
    toolchainReady = status.ready;
  });

  it('should use real CLI when tools are available', async () => {
    if (!toolchainReady) {
      console.log('Skipping CLI test - nargo/sunspot not installed');
      return;
    }

    const prover = createNoirProver({ useCLI: true, verbose: true });
    await prover.initialize();

    expect(prover.getMode()).toBe('cli');
    expect(prover.isUsingCLI()).toBe(true);
  });

  it('should report toolchain versions', async () => {
    if (!toolchainReady) {
      console.log('Skipping CLI test - nargo/sunspot not installed');
      return;
    }

    const status = await checkNoirToolchain();

    console.log('\n=== Toolchain Status ===');
    console.log(`nargo: ${status.nargo.version} (${status.nargo.path})`);
    console.log(`sunspot: ${status.sunspot.version} (${status.sunspot.path})`);
  });
});
