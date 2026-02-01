/**
 * MockPrivacyCash Tests
 * Tests for the devnet mock implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { MockPrivacyCash } from '../src/privacy-cash/mock';
import { SpykConfig, InvalidAmountError, InsufficientBalanceError } from '../src';

describe('MockPrivacyCash', () => {
  let config: SpykConfig;
  let connection: Connection;
  let mockPC: MockPrivacyCash;

  beforeEach(() => {
    config = {
      quicknodeUrl: 'https://api.devnet.solana.com',
      network: 'devnet',
      wallet: Keypair.generate(),
    };

    connection = new Connection('https://api.devnet.solana.com');

    // Create mock with minimal logging for tests
    mockPC = new MockPrivacyCash(config, connection, {
      logOperations: false,
      simulateProofDelay: 0, // No delay for faster tests
      colorfulOutput: false,
      showProgress: false,
    });
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(mockPC).toBeInstanceOf(MockPrivacyCash);
    });

    it('should expose wallet public key', () => {
      expect(mockPC.walletPublicKey.toBase58()).toBe(
        config.wallet.publicKey.toBase58()
      );
    });

    it('should correctly identify as mock', () => {
      expect(MockPrivacyCash.isMock()).toBe(true);
    });
  });

  describe('balance management', () => {
    it('should start with zero balance', async () => {
      mockPC.resetBalances();
      const solBalance = await mockPC.getPrivateBalance('SOL');
      const usdcBalance = await mockPC.getPrivateBalance('USDC');

      expect(solBalance.amount).toBe(BigInt(0));
      expect(usdcBalance.amount).toBe(BigInt(0));
    });

    it('should allow setting balance directly', () => {
      const amount = BigInt(5 * LAMPORTS_PER_SOL);
      mockPC.setBalance('SOL', amount);

      const balances = mockPC.getAllBalances();
      expect(balances.raw.SOL).toBe(amount);
    });

    it('should format balances correctly', () => {
      mockPC.setBalance('SOL', BigInt(2.5 * LAMPORTS_PER_SOL));
      mockPC.setBalance('USDC', BigInt(100 * 1000000)); // 100 USDC

      const balances = mockPC.getAllBalances();
      expect(balances.SOL).toBe('2.5000 SOL');
      expect(balances.USDC).toBe('100.00 USDC');
    });

    it('should reset balances', () => {
      mockPC.setBalance('SOL', BigInt(5 * LAMPORTS_PER_SOL));
      mockPC.resetBalances();

      const balances = mockPC.getAllBalances();
      expect(balances.raw.SOL).toBe(BigInt(0));
      expect(balances.raw.USDC).toBe(BigInt(0));
    });
  });

  describe('depositUSDC (no network required)', () => {
    beforeEach(() => {
      mockPC.resetBalances();
    });

    it('should reject negative amount', async () => {
      await expect(mockPC.depositUSDC(-1)).rejects.toThrow(InvalidAmountError);
    });

    it('should reject zero amount', async () => {
      await expect(mockPC.depositUSDC(0)).rejects.toThrow(InvalidAmountError);
    });

    it('should successfully deposit USDC', async () => {
      const result = await mockPC.depositUSDC(100);

      expect(result.status).toBe('confirmed');
      expect(result.protocol).toBe('privacy-cash');
      expect(result.token).toBe('USDC');
      expect(result.amount).toBe(BigInt(100 * 1000000));
    });

    it('should update balance after deposit', async () => {
      await mockPC.depositUSDC(50);
      await mockPC.depositUSDC(25);

      const balance = await mockPC.getPrivateBalance('USDC');
      expect(balance.amount).toBe(BigInt(75 * 1000000));
    });

    it('should call callbacks', async () => {
      const callbacks = {
        onSigning: vi.fn(),
        onSent: vi.fn(),
        onConfirmed: vi.fn(),
      };

      await mockPC.depositUSDC(10, callbacks);

      expect(callbacks.onSigning).toHaveBeenCalled();
      expect(callbacks.onSent).toHaveBeenCalled();
      expect(callbacks.onConfirmed).toHaveBeenCalled();
    });
  });

  describe('withdrawUSDC', () => {
    beforeEach(() => {
      mockPC.resetBalances();
      mockPC.setBalance('USDC', BigInt(100 * 1000000)); // 100 USDC
    });

    it('should reject negative amount', async () => {
      await expect(mockPC.withdrawUSDC(-1)).rejects.toThrow(InvalidAmountError);
    });

    it('should reject zero amount', async () => {
      await expect(mockPC.withdrawUSDC(0)).rejects.toThrow(InvalidAmountError);
    });

    it('should reject insufficient balance', async () => {
      await expect(mockPC.withdrawUSDC(200)).rejects.toThrow(InsufficientBalanceError);
    });

    it('should successfully withdraw USDC', async () => {
      const result = await mockPC.withdrawUSDC(50);

      expect(result.status).toBe('confirmed');
      expect(result.protocol).toBe('privacy-cash');
      expect(result.token).toBe('USDC');
      expect(result.fee).toBeDefined();
    });

    it('should update balance after withdraw', async () => {
      await mockPC.withdrawUSDC(30);

      const balance = await mockPC.getPrivateBalance('USDC');
      expect(balance.amount).toBe(BigInt(70 * 1000000));
    });

    it('should accept string destination', async () => {
      const destination = Keypair.generate().publicKey.toBase58();
      const result = await mockPC.withdrawUSDC(10, destination);

      expect(result.destination.toBase58()).toBe(destination);
    });
  });

  describe('mock signature generation', () => {
    it('should generate realistic-looking signatures', async () => {
      mockPC.setBalance('USDC', BigInt(100 * 1000000));

      const result = await mockPC.withdrawUSDC(10);

      // Check signature is base58-like (87-88 chars)
      expect(result.signature.length).toBeGreaterThanOrEqual(87);
      expect(result.signature.length).toBeLessThanOrEqual(88);

      // Check it only contains base58 characters
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      expect(base58Regex.test(result.signature)).toBe(true);
    });

    it('should generate unique signatures', async () => {
      const signatures: string[] = [];

      for (let i = 0; i < 5; i++) {
        mockPC.setBalance('USDC', BigInt(100 * 1000000));
        const result = await mockPC.withdrawUSDC(10);
        signatures.push(result.signature);
      }

      const uniqueSigs = new Set(signatures);
      expect(uniqueSigs.size).toBe(5);
    });
  });

  describe('getMockInfo', () => {
    it('should return mock info', () => {
      const info = mockPC.getMockInfo();

      expect(info.isMock).toBe(true);
      expect(info.walletAddress).toBe(config.wallet.publicKey.toBase58());
      expect(info.operationCount).toBe(0);
      expect(info.config).toBeDefined();
    });

    it('should track operation count', async () => {
      await mockPC.depositUSDC(10);
      await mockPC.depositUSDC(20);

      const info = mockPC.getMockInfo();
      expect(info.operationCount).toBe(2);
    });
  });
});

// Import vi for mocking
import { vi } from 'vitest';
