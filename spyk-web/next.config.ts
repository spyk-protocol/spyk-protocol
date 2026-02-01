import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of turbopack for better WASM module support
  // The @lightprotocol/hasher.rs WASM module causes issues with turbopack
  turbopack: {
    // Enable experimental server external packages support
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'],
  },
  // Mark problematic modules as external for server-side
  serverExternalPackages: ['privacycash', '@lightprotocol/hasher.rs'],
};

export default nextConfig;
