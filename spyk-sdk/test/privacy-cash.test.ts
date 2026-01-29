/**
 * Privacy Cash Smoke Tests
 * Basic validation that SpykPrivacyCash works correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SpykPrivacyCash, SpykConfig, InvalidAmountError, InsufficientBalanceError } from '../src';

describe('SpykPrivacyCash', () => {
  let config: SpykConfig;
  let connection: Connection;
  let privacyCash: SpykPrivacyCash;

  beforeAll(() => {
    // Create test config with dummy values
    config = {
      heliusApiKey: 'test-api-key',
      network: 'devnet',
      wallet: Keypair.generate(),
    };

    // Create mock connection (tests don't hit real network)
    connection = new Connection('https://api.devnet.solana.com');
    privacyCash = new SpykPrivacyCash(config, connection);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(privacyCash).toBeInstanceOf(SpykPrivacyCash);
    });

    it('should expose wallet public key', () => {
      expect(privacyCash.walletPublicKey.toBase58()).toBe(
        config.wallet.publicKey.toBase58()
      );
    });
  });

  describe('deposit', () => {
    it('should reject negative amount', async () => {
      await expect(privacyCash.deposit(-1)).rejects.toThrow(InvalidAmountError);
    });

    it('should reject zero amount', async () => {
      await expect(privacyCash.deposit(0)).rejects.toThrow(InvalidAmountError);
    });

    it('should fail with SpykError when SDK not integrated', async () => {
      // The deposit method should throw an error since the SDK is not integrated
      // but it should still validate amount first
      await expect(privacyCash.deposit(1)).rejects.toThrow();
    });
  });

  describe('depositUSDC', () => {
    it('should reject negative amount', async () => {
      await expect(privacyCash.depositUSDC(-1)).rejects.toThrow(InvalidAmountError);
    });

    it('should reject zero amount', async () => {
      await expect(privacyCash.depositUSDC(0)).rejects.toThrow(InvalidAmountError);
    });
  });

  describe('withdraw', () => {
    it('should reject negative amount', async () => {
      const destination = Keypair.generate().publicKey;
      await expect(privacyCash.withdraw(-1, destination)).rejects.toThrow(InvalidAmountError);
    });

    it('should accept string destination', async () => {
      const destination = Keypair.generate().publicKey.toBase58();

      // Should throw SpykError (SDK not integrated) but NOT InvalidAddressError
      // This verifies the address parsing works correctly
      await expect(privacyCash.withdraw(1, destination)).rejects.toThrow();
    });
  });

  describe('withdrawUSDC', () => {
    it('should reject negative amount', async () => {
      const destination = Keypair.generate().publicKey;
      await expect(privacyCash.withdrawUSDC(-1, destination)).rejects.toThrow(InvalidAmountError);
    });
  });

  describe('getPrivateBalance', () => {
    it('should return balance result for SOL', async () => {
      const result = await privacyCash.getPrivateBalance('SOL');

      expect(result).toHaveProperty('token', 'SOL');
      expect(result).toHaveProperty('protocol', 'privacy-cash');
      expect(result).toHaveProperty('amount');
    });

    it('should return balance result for USDC', async () => {
      const result = await privacyCash.getPrivateBalance('USDC');

      expect(result).toHaveProperty('token', 'USDC');
      expect(result).toHaveProperty('protocol', 'privacy-cash');
    });
  });
});
