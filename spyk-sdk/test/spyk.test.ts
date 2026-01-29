/**
 * Spyk Unified Class Integration Tests
 * Tests for the main Spyk class and protocol routing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import {
  Spyk,
  SpykPrivacyCash,
  SpykShadowWire,
  SpykConfig,
  InvalidAmountError,
  UnsupportedTokenError,
} from '../src';

describe('Spyk', () => {
  let config: SpykConfig;
  let spyk: Spyk;

  beforeAll(() => {
    config = {
      heliusApiKey: 'test-api-key',
      network: 'devnet',
      wallet: Keypair.generate(),
    };

    spyk = new Spyk(config);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(spyk).toBeInstanceOf(Spyk);
    });

    it('should expose privacyCash wrapper', () => {
      expect(spyk.privacyCash).toBeInstanceOf(SpykPrivacyCash);
    });

    it('should expose shadowWire wrapper', () => {
      expect(spyk.shadowWire).toBeInstanceOf(SpykShadowWire);
    });

    it('should expose wallet public key', () => {
      expect(spyk.walletPublicKey.toBase58()).toBe(
        config.wallet.publicKey.toBase58()
      );
    });

    it('should expose RPC connection', () => {
      expect(spyk.rpcConnection).toBeDefined();
    });
  });

  describe('protocol routing', () => {
    it('should identify SOL as Privacy Cash token', () => {
      expect(spyk.supportsDeposit('SOL')).toBe(true);
      expect(spyk.getProtocolForToken('SOL')).toBe('privacy-cash');
    });

    it('should identify USDC as Privacy Cash token', () => {
      expect(spyk.supportsDeposit('USDC')).toBe(true);
      expect(spyk.getProtocolForToken('USDC')).toBe('privacy-cash');
    });

    it('should identify BONK as ShadowWire token', () => {
      expect(spyk.supportsDeposit('BONK')).toBe(false);
      expect(spyk.getProtocolForToken('BONK')).toBe('shadowwire');
    });

    it('should be case insensitive', () => {
      expect(spyk.supportsDeposit('sol')).toBe(true);
      expect(spyk.supportsDeposit('Sol')).toBe(true);
      expect(spyk.supportsDeposit('usdc')).toBe(true);
    });
  });

  describe('deposit', () => {
    it('should reject unsupported token', async () => {
      await expect(
        // @ts-expect-error Testing invalid token
        spyk.deposit('BONK', 100)
      ).rejects.toThrow(UnsupportedTokenError);
    });

    it('should reject negative amount for SOL', async () => {
      await expect(spyk.deposit('SOL', -1)).rejects.toThrow(InvalidAmountError);
    });

    it('should reject negative amount for USDC', async () => {
      await expect(spyk.deposit('USDC', -1)).rejects.toThrow(InvalidAmountError);
    });
  });

  describe('withdraw', () => {
    it('should reject unsupported token', async () => {
      await expect(
        // @ts-expect-error Testing invalid token
        spyk.withdraw('RADR', 100)
      ).rejects.toThrow(UnsupportedTokenError);
    });

    it('should reject negative amount', async () => {
      await expect(spyk.withdraw('SOL', -1)).rejects.toThrow(InvalidAmountError);
    });
  });

  describe('transfer', () => {
    const validRecipient = Keypair.generate().publicKey;

    it('should reject negative amount', async () => {
      await expect(
        spyk.transfer({
          to: validRecipient,
          amount: -1,
          token: 'SOL',
        })
      ).rejects.toThrow(InvalidAmountError);
    });

    it('should route SOL transfers', async () => {
      // Should throw SpykError (SDK not integrated), not routing error
      await expect(
        spyk.transfer({
          to: validRecipient,
          amount: 1,
          token: 'SOL',
        })
      ).rejects.toThrow();
    });

    it('should route BONK transfers', async () => {
      // Should throw SpykError (SDK not integrated), not routing error
      await expect(
        spyk.transfer({
          to: validRecipient,
          amount: 1000,
          token: 'BONK',
        })
      ).rejects.toThrow();
    });
  });

  describe('getBalance', () => {
    it('should return balance for SOL', async () => {
      const result = await spyk.getBalance('SOL');

      expect(result).toHaveProperty('token', 'SOL');
      expect(result).toHaveProperty('protocol');
    });

    it('should return balance for USDC', async () => {
      const result = await spyk.getBalance('USDC');

      expect(result).toHaveProperty('token', 'USDC');
    });

    it('should return balance for BONK via ShadowWire', async () => {
      const result = await spyk.getBalance('BONK');

      expect(result).toHaveProperty('token', 'BONK');
      expect(result).toHaveProperty('protocol', 'shadowwire');
    });

    it('should return aggregated balances when no token specified', async () => {
      const result = await spyk.getBalance();

      expect(result).toHaveProperty('privacyCash');
      expect(result).toHaveProperty('shadowWire');
      // @ts-ignore
      expect(result.privacyCash).toHaveProperty('SOL');
      // @ts-ignore
      expect(result.privacyCash).toHaveProperty('USDC');
    });
  });
});
