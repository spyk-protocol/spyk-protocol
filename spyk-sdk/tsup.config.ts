import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  // Mark all dependencies as external to prevent bundling
  // This fixes the "Dynamic require of X is not supported" error in ESM
  external: [
    // Solana ecosystem
    '@solana/web3.js',
    '@coral-xyz/anchor',

    // Privacy protocols
    'privacycash',
    '@radr/shadowwire',

    // Arcium
    '@arcium-hq/client',
    '@arcium-hq/reader',

    // x402
    'x402-solana',

    // Helius
    'helius-sdk',

    // Crypto libs
    '@noble/ed25519',
    'tweetnacl',
  ],
  // Don't bundle node_modules at all - mark all as external
  noExternal: [],
});
