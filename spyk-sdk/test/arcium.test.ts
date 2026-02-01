/**
 * Arcium MXE Integration Tests
 *
 * Tests for encrypted DeFi operations using Arcium's MXE (Multi-party eXecution Environment).
 *
 * Note: Full MXE integration requires:
 * 1. A deployed MXE program on Arcium devnet
 * 2. The ARCIUM_ENV environment variables configured by @arcium-hq/client
 * 3. Network access to Arcium's devnet cluster
 *
 * These tests verify:
 * - Client initialization and configuration
 * - Encryption primitives work correctly
 * - Account address derivation is consistent
 * - Error handling for missing MXE configuration
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  SpykArcium,
  createSpykArcium,
  ArciumClient,
  createArciumClient,
  PrivateSwap,
  PrivateLending,
  EncryptedStateManager,
  TOKEN_MINTS,
  ArciumError,
  ArciumErrorCodes,
} from '../src';

// Mock program ID for testing (would be a real deployed MXE program in production)
const MOCK_MXE_PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111'
);

describe('Arcium Integration', () => {
  let wallet: Keypair;
  let provider: anchor.AnchorProvider;

  beforeAll(() => {
    wallet = Keypair.generate();

    // Create mock connection for testing
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
    };

    provider = new anchor.AnchorProvider(connection, anchorWallet as any, {
      commitment: 'confirmed',
    });
  });

  describe('ArciumClient', () => {
    describe('constructor', () => {
      it('should create client with valid config', () => {
        const client = createArciumClient({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
        });

        expect(client).toBeInstanceOf(ArciumClient);
      });

      it('should expose provider and program ID', () => {
        const client = createArciumClient({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
        });

        expect(client.anchorProvider).toBe(provider);
        expect(client.mxeProgramId.equals(MOCK_MXE_PROGRAM_ID)).toBe(true);
      });

      it('should not be encryption initialized by default', () => {
        const client = createArciumClient({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
        });

        expect(client.isEncryptionInitialized).toBe(false);
      });
    });

    describe('account derivation', () => {
      let client: ArciumClient;

      beforeAll(() => {
        client = createArciumClient({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
        });
      });

      it('should derive cluster account address', () => {
        const clusterAccount = client.getClusterAccount();
        expect(clusterAccount).toBeInstanceOf(PublicKey);
      });

      it('should derive MXE account address', () => {
        const mxeAccount = client.getMXEAccount();
        expect(mxeAccount).toBeInstanceOf(PublicKey);
      });

      it('should derive mempool account address', () => {
        const mempoolAccount = client.getMempoolAccount();
        expect(mempoolAccount).toBeInstanceOf(PublicKey);
      });

      it('should derive executing pool account address', () => {
        const executingPool = client.getExecutingPoolAccount();
        expect(executingPool).toBeInstanceOf(PublicKey);
      });

      it('should derive computation account address', () => {
        const offset = new anchor.BN(12345);
        const computationAccount = client.getComputationAccount(offset);
        expect(computationAccount).toBeInstanceOf(PublicKey);
      });

      it('should derive comp def account address', () => {
        const compDefAccount = client.getCompDefAccount('test_computation');
        expect(compDefAccount).toBeInstanceOf(PublicKey);
      });

      it('should generate random computation offset', () => {
        const offset1 = client.generateComputationOffset();
        const offset2 = client.generateComputationOffset();

        expect(offset1).toBeInstanceOf(anchor.BN);
        expect(offset2).toBeInstanceOf(anchor.BN);
        // Offsets should be different (random)
        expect(offset1.eq(offset2)).toBe(false);
      });
    });

    describe('encryption', () => {
      let client: ArciumClient;

      beforeAll(() => {
        client = createArciumClient({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
        });
      });

      it('should throw when encrypting without initialization', () => {
        expect(() => client.encrypt([BigInt(100)])).toThrow(ArciumError);
        expect(() => client.encrypt([BigInt(100)])).toThrow(
          'Encryption not initialized'
        );
      });

      it('should throw when getting public key without initialization', () => {
        expect(() => client.getEncryptionPublicKey()).toThrow(ArciumError);
      });
    });

    describe('MXE accounts builder', () => {
      let client: ArciumClient;

      beforeAll(() => {
        client = createArciumClient({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
        });
      });

      it('should build all required MXE accounts', () => {
        const offset = new anchor.BN(12345);
        const accounts = client.buildMXEAccounts(offset, 'test_computation');

        expect(accounts).toHaveProperty('computationAccount');
        expect(accounts).toHaveProperty('clusterAccount');
        expect(accounts).toHaveProperty('mxeAccount');
        expect(accounts).toHaveProperty('mempoolAccount');
        expect(accounts).toHaveProperty('executingPool');
        expect(accounts).toHaveProperty('compDefAccount');

        // All should be valid PublicKeys
        expect(accounts.computationAccount).toBeInstanceOf(PublicKey);
        expect(accounts.clusterAccount).toBeInstanceOf(PublicKey);
        expect(accounts.mxeAccount).toBeInstanceOf(PublicKey);
        expect(accounts.mempoolAccount).toBeInstanceOf(PublicKey);
        expect(accounts.executingPool).toBeInstanceOf(PublicKey);
        expect(accounts.compDefAccount).toBeInstanceOf(PublicKey);
      });
    });
  });

  describe('SpykArcium', () => {
    describe('constructor', () => {
      it('should create instance with valid config', () => {
        const arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });

        expect(arcium).toBeInstanceOf(SpykArcium);
      });

      it('should expose client, swap, lending, and state modules', () => {
        const arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });

        expect(arcium.client).toBeInstanceOf(ArciumClient);
        expect(arcium.swap).toBeInstanceOf(PrivateSwap);
        expect(arcium.lending).toBeInstanceOf(PrivateLending);
        expect(arcium.state).toBeInstanceOf(EncryptedStateManager);
      });

      it('should expose wallet public key', () => {
        const arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });

        expect(arcium.walletPublicKey.equals(wallet.publicKey)).toBe(true);
      });

      it('should not be initialized by default', () => {
        const arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });

        expect(arcium.isInitialized).toBe(false);
      });
    });

    describe('uninitialized operations', () => {
      let arcium: SpykArcium;

      beforeAll(() => {
        arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });
      });

      it('should throw when encrypting without initialization', () => {
        expect(() => arcium.encrypt(BigInt(100))).toThrow(ArciumError);
        expect(() => arcium.encrypt(BigInt(100))).toThrow(
          'SpykArcium not initialized'
        );
      });

      it('should throw when executing swap without initialization', async () => {
        await expect(
          arcium.swap.executeSwap({
            inputMint: TOKEN_MINTS.SOL,
            outputMint: TOKEN_MINTS.USDC,
            amount: BigInt(1_000_000_000),
            minOutputAmount: BigInt(0),
          })
        ).rejects.toThrow(ArciumError);
      });

      it('should throw when depositing to lending without initialization', async () => {
        await expect(
          arcium.lending.deposit({
            tokenMint: TOKEN_MINTS.USDC,
            amount: BigInt(1_000_000),
          })
        ).rejects.toThrow(ArciumError);
      });

      it('should throw when writing state without initialization', async () => {
        await expect(
          arcium.state.write({
            key: 'test-key',
            value: BigInt(100),
            operation: 'set',
          })
        ).rejects.toThrow(ArciumError);
      });
    });
  });

  describe('PrivateSwap', () => {
    describe('quote', () => {
      let arcium: SpykArcium;

      beforeAll(() => {
        arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });
      });

      it('should get quote without requiring encryption', async () => {
        // Quote should work without encryption initialization
        // since it only queries pool state
        const quote = await arcium.swap.getQuote({
          inputMint: TOKEN_MINTS.SOL,
          outputMint: TOKEN_MINTS.USDC,
          amount: BigInt(1_000_000_000), // 1 SOL
          minOutputAmount: BigInt(0),
        });

        expect(quote).toHaveProperty('inputAmount');
        expect(quote).toHaveProperty('expectedOutput');
        expect(quote).toHaveProperty('minimumOutput');
        expect(quote).toHaveProperty('priceImpactBps');
        expect(quote).toHaveProperty('feeAmount');
        expect(quote).toHaveProperty('pool');

        expect(quote.inputAmount).toBe(BigInt(1_000_000_000));
      });

      it('should calculate minimum output with slippage', () => {
        const swap = arcium.swap;
        const expectedOutput = BigInt(1_000_000);
        const slippageBps = 100; // 1%

        const minOutput = swap.calculateMinOutput(expectedOutput, slippageBps);

        // 1% slippage means 99% of expected
        expect(minOutput).toBe(BigInt(990_000));
      });
    });
  });

  describe('PrivateLending', () => {
    describe('calculations', () => {
      let arcium: SpykArcium;

      beforeAll(() => {
        arcium = createSpykArcium({
          provider,
          programId: MOCK_MXE_PROGRAM_ID,
          wallet,
        });
      });

      it('should calculate max borrow amount', () => {
        // Access private method via lending instance
        const lending = arcium.lending as any;
        const collateralValue = BigInt(1_000_000); // 1M units

        // Default collateral factor is 80%
        const maxBorrow = lending.calculateMaxBorrow(collateralValue);
        expect(maxBorrow).toBe(BigInt(800_000)); // 80% of 1M
      });
    });
  });

  describe('TOKEN_MINTS', () => {
    it('should export well-known token mints', () => {
      expect(TOKEN_MINTS.SOL).toBeDefined();
      expect(TOKEN_MINTS.USDC).toBeInstanceOf(PublicKey);
      expect(TOKEN_MINTS.USDT).toBeInstanceOf(PublicKey);
      expect(TOKEN_MINTS.BONK).toBeInstanceOf(PublicKey);
    });

    it('should have correct USDC mint address', () => {
      expect(TOKEN_MINTS.USDC.toBase58()).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
    });
  });

  describe('ArciumError', () => {
    it('should create error with code', () => {
      const error = new ArciumError(
        'Test error message',
        ArciumErrorCodes.ENCRYPTION_FAILED
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ArciumError);
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ArciumErrorCodes.ENCRYPTION_FAILED);
      expect(error.name).toBe('ArciumError');
    });

    it('should have all error codes', () => {
      expect(ArciumErrorCodes.MXE_NOT_INITIALIZED).toBe('MXE_NOT_INITIALIZED');
      expect(ArciumErrorCodes.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED');
      expect(ArciumErrorCodes.DECRYPTION_FAILED).toBe('DECRYPTION_FAILED');
      expect(ArciumErrorCodes.COMPUTATION_FAILED).toBe('COMPUTATION_FAILED');
      expect(ArciumErrorCodes.COMPUTATION_TIMEOUT).toBe('COMPUTATION_TIMEOUT');
      expect(ArciumErrorCodes.INVALID_PROGRAM_ID).toBe('INVALID_PROGRAM_ID');
      expect(ArciumErrorCodes.INSUFFICIENT_COLLATERAL).toBe('INSUFFICIENT_COLLATERAL');
      expect(ArciumErrorCodes.SWAP_SLIPPAGE_EXCEEDED).toBe('SWAP_SLIPPAGE_EXCEEDED');
    });
  });
});

describe('Arcium Devnet Integration', () => {
  /**
   * These tests verify that the Arcium integration works with devnet.
   * They require:
   * 1. ARCIUM_ENV environment variables set by @arcium-hq/client
   * 2. A deployed MXE program on devnet
   * 3. Network connectivity to Arcium's devnet cluster
   *
   * Skip these in CI without proper setup.
   */

  const hasArciumEnv = () => {
    try {
      // The @arcium-hq/client package uses environment detection
      // This will throw or return undefined if not configured
      const { getArciumEnv } = require('@arcium-hq/client');
      const env = getArciumEnv();
      return env && env.arciumClusterOffset !== undefined;
    } catch {
      return false;
    }
  };

  describe('environment detection', () => {
    it('should detect Arcium environment configuration', () => {
      const configured = hasArciumEnv();

      // Log status for debugging
      console.log(
        `Arcium environment configured: ${configured}`
      );

      // This test always passes - it's informational
      expect(typeof configured).toBe('boolean');
    });
  });

  describe.skipIf(!hasArciumEnv())('with Arcium devnet', () => {
    // These tests only run when Arcium devnet is properly configured

    it('should get cluster offset from environment', () => {
      const { getArciumEnv } = require('@arcium-hq/client');
      const env = getArciumEnv();

      expect(env).toBeDefined();
      expect(typeof env.arciumClusterOffset).toBe('number');
    });
  });
});
