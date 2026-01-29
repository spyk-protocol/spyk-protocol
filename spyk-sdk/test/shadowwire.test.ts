/**
 * ShadowWire Smoke Tests
 * Basic validation that SpykShadowWire works correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import {
  SpykShadowWire,
  SpykConfig,
  InvalidAmountError,
  InvalidAddressError,
} from '../src';

describe('SpykShadowWire', () => {
  let config: SpykConfig;
  let connection: Connection;
  let shadowWire: SpykShadowWire;

  beforeAll(() => {
    // Create test config with dummy values
    config = {
      heliusApiKey: 'test-api-key',
      network: 'devnet',
      wallet: Keypair.generate(),
    };

    // Create mock connection (tests don't hit real network)
    connection = new Connection('https://api.devnet.solana.com');
    shadowWire = new SpykShadowWire(config, connection);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(shadowWire).toBeInstanceOf(SpykShadowWire);
    });

    it('should expose wallet public key', () => {
      expect(shadowWire.walletPublicKey.toBase58()).toBe(
        config.wallet.publicKey.toBase58()
      );
    });
  });

  describe('transfer', () => {
    const validRecipient = Keypair.generate().publicKey;

    it('should reject negative amount', async () => {
      await expect(
        shadowWire.transfer({
          to: validRecipient,
          amount: -1,
          token: 'SOL',
        })
      ).rejects.toThrow(InvalidAmountError);
    });

    it('should reject zero amount', async () => {
      await expect(
        shadowWire.transfer({
          to: validRecipient,
          amount: 0,
          token: 'BONK',
        })
      ).rejects.toThrow(InvalidAmountError);
    });

    it('should reject invalid address string', async () => {
      await expect(
        shadowWire.transfer({
          to: 'not-a-valid-address',
          amount: 100,
          token: 'BONK',
        })
      ).rejects.toThrow(InvalidAddressError);
    });

    it('should accept PublicKey as destination', async () => {
      let signingCalled = false;

      try {
        await shadowWire.transfer(
          {
            to: validRecipient,
            amount: 100,
            token: 'BONK',
          },
          {
            onSigning: () => {
              signingCalled = true;
            },
          }
        );
      } catch {
        // Expected to fail (no real network)
      }

      expect(signingCalled).toBe(true);
    });

    it('should accept string as destination', async () => {
      let signingCalled = false;

      try {
        await shadowWire.transfer(
          {
            to: validRecipient.toBase58(),
            amount: 100,
            token: 'BONK',
          },
          {
            onSigning: () => {
              signingCalled = true;
            },
          }
        );
      } catch {
        // Expected to fail (no real network)
      }

      expect(signingCalled).toBe(true);
    });
  });

  describe('hasShadowWireAccount', () => {
    it('should return boolean for valid address', async () => {
      const address = Keypair.generate().publicKey;
      const result = await shadowWire.hasShadowWireAccount(address);

      expect(typeof result).toBe('boolean');
    });

    it('should accept string address', async () => {
      const address = Keypair.generate().publicKey.toBase58();
      const result = await shadowWire.hasShadowWireAccount(address);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getBalance', () => {
    it('should return balance result for supported tokens', async () => {
      const tokens = ['SOL', 'USDC', 'BONK', 'RADR', 'ORE'];

      for (const token of tokens) {
        const result = await shadowWire.getBalance(token);

        expect(result).toHaveProperty('token', token);
        expect(result).toHaveProperty('protocol', 'shadowwire');
        expect(result).toHaveProperty('amount');
      }
    });
  });

  describe('getSupportedTokens', () => {
    it('should return array of token symbols', () => {
      const tokens = shadowWire.getSupportedTokens();

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens).toContain('SOL');
      expect(tokens).toContain('USDC');
      expect(tokens).toContain('BONK');
    });
  });

  describe('isTokenSupported', () => {
    it('should return true for supported tokens', () => {
      expect(shadowWire.isTokenSupported('SOL')).toBe(true);
      expect(shadowWire.isTokenSupported('USDC')).toBe(true);
      expect(shadowWire.isTokenSupported('BONK')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(shadowWire.isTokenSupported('sol')).toBe(true);
      expect(shadowWire.isTokenSupported('Sol')).toBe(true);
      expect(shadowWire.isTokenSupported('bonk')).toBe(true);
    });

    it('should return false for unsupported tokens', () => {
      expect(shadowWire.isTokenSupported('UNKNOWN_TOKEN_XYZ')).toBe(false);
    });
  });
});
