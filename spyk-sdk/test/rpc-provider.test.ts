/**
 * RPC Provider Tests
 * Tests for Quicknode and multi-provider support
 *
 * This test suite verifies:
 * - Quicknode URL configuration works
 * - Helius API key configuration works
 * - Provider auto-detection works correctly
 * - Connection creation works for all providers
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair, Connection } from '@solana/web3.js';
import {
  Spyk,
  SpykConfig,
  createConnection,
  getRpcUrl,
  HeliusConnectionError,
} from '../src';

describe('RPC Provider Configuration', () => {
  describe('getRpcUrl', () => {
    const baseConfig = {
      network: 'devnet' as const,
      wallet: Keypair.generate(),
    };

    it('should return Quicknode URL when quicknodeUrl is set', () => {
      const config: SpykConfig = {
        ...baseConfig,
        quicknodeUrl: 'https://example.solana-devnet.quiknode.pro/abc123/',
      };

      const url = getRpcUrl(config);
      expect(url).toBe('https://example.solana-devnet.quiknode.pro/abc123/');
    });

    it('should return Helius URL when heliusApiKey is set', () => {
      const config: SpykConfig = {
        ...baseConfig,
        heliusApiKey: 'test-api-key',
      };

      const url = getRpcUrl(config);
      expect(url).toContain('helius-rpc.com');
      expect(url).toContain('test-api-key');
    });

    it('should return custom URL when customRpcUrl is set', () => {
      const config: SpykConfig = {
        ...baseConfig,
        customRpcUrl: 'https://custom-rpc.example.com',
      };

      const url = getRpcUrl(config);
      expect(url).toBe('https://custom-rpc.example.com');
    });

    it('should prefer Quicknode when both Quicknode and Helius are set (no explicit provider)', () => {
      const config: SpykConfig = {
        ...baseConfig,
        quicknodeUrl: 'https://quicknode.example.com',
        heliusApiKey: 'test-api-key',
      };

      const url = getRpcUrl(config);
      expect(url).toBe('https://quicknode.example.com');
    });

    it('should respect explicit rpcProvider setting', () => {
      const config: SpykConfig = {
        ...baseConfig,
        rpcProvider: 'helius',
        quicknodeUrl: 'https://quicknode.example.com',
        heliusApiKey: 'test-api-key',
      };

      const url = getRpcUrl(config);
      expect(url).toContain('helius-rpc.com');
    });

    it('should throw error when no provider is configured', () => {
      const config: SpykConfig = {
        ...baseConfig,
      };

      expect(() => getRpcUrl(config)).toThrow(HeliusConnectionError);
    });

    it('should throw error when Helius is specified but key is missing', () => {
      const config: SpykConfig = {
        ...baseConfig,
        rpcProvider: 'helius',
      };

      expect(() => getRpcUrl(config)).toThrow('HELIUS_API_KEY is required');
    });

    it('should throw error when Quicknode is specified but URL is missing', () => {
      const config: SpykConfig = {
        ...baseConfig,
        rpcProvider: 'quicknode',
      };

      expect(() => getRpcUrl(config)).toThrow('QUICKNODE_URL is required');
    });
  });

  describe('createConnection', () => {
    const baseConfig = {
      network: 'devnet' as const,
      wallet: Keypair.generate(),
    };

    it('should create connection with Quicknode URL', () => {
      const config: SpykConfig = {
        ...baseConfig,
        quicknodeUrl: 'https://example.solana-devnet.quiknode.pro/abc123/',
      };

      const connection = createConnection(config);
      expect(connection).toBeInstanceOf(Connection);
    });

    it('should create connection with Helius API key', () => {
      const config: SpykConfig = {
        ...baseConfig,
        heliusApiKey: 'test-api-key',
      };

      const connection = createConnection(config);
      expect(connection).toBeInstanceOf(Connection);
    });

    it('should create connection with custom RPC URL', () => {
      const config: SpykConfig = {
        ...baseConfig,
        customRpcUrl: 'https://api.devnet.solana.com',
      };

      const connection = createConnection(config);
      expect(connection).toBeInstanceOf(Connection);
    });
  });

  describe('Spyk class with different providers', () => {
    it('should create Spyk instance with Quicknode URL', () => {
      const config: SpykConfig = {
        network: 'devnet',
        wallet: Keypair.generate(),
        quicknodeUrl: 'https://example.solana-devnet.quiknode.pro/abc123/',
      };

      const spyk = new Spyk(config);
      expect(spyk).toBeDefined();
      expect(spyk.rpcConnection).toBeInstanceOf(Connection);
    });

    it('should create Spyk instance with Helius API key', () => {
      const config: SpykConfig = {
        network: 'devnet',
        wallet: Keypair.generate(),
        heliusApiKey: 'test-api-key',
      };

      const spyk = new Spyk(config);
      expect(spyk).toBeDefined();
      expect(spyk.rpcConnection).toBeInstanceOf(Connection);
    });

    it('should expose privacyCash and shadowWire with Quicknode', () => {
      const config: SpykConfig = {
        network: 'devnet',
        wallet: Keypair.generate(),
        quicknodeUrl: 'https://example.solana-devnet.quiknode.pro/abc123/',
      };

      const spyk = new Spyk(config);
      expect(spyk.privacyCash).toBeDefined();
      expect(spyk.shadowWire).toBeDefined();
    });
  });

  describe('Network/Cluster handling', () => {
    it('should use devnet endpoint for Helius when network is devnet', () => {
      const config: SpykConfig = {
        network: 'devnet',
        wallet: Keypair.generate(),
        heliusApiKey: 'test-key',
      };

      const url = getRpcUrl(config);
      expect(url).toContain('devnet.helius-rpc.com');
    });

    it('should use mainnet endpoint for Helius when network is mainnet', () => {
      const config: SpykConfig = {
        network: 'mainnet',
        wallet: Keypair.generate(),
        heliusApiKey: 'test-key',
      };

      const url = getRpcUrl(config);
      expect(url).toContain('mainnet.helius-rpc.com');
    });

    it('should use Quicknode URL as-is regardless of network setting', () => {
      const quicknodeUrl = 'https://example.solana-mainnet.quiknode.pro/abc123/';
      const config: SpykConfig = {
        network: 'devnet', // This should be ignored for Quicknode
        wallet: Keypair.generate(),
        quicknodeUrl,
      };

      const url = getRpcUrl(config);
      expect(url).toBe(quicknodeUrl);
    });
  });
});
