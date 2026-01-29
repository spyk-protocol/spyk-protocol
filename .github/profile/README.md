# SPYK Protocol

**Privacy-preserving payments for AI agents on Solana**

<p align="center">
  <img src="https://img.shields.io/badge/Solana-black?style=for-the-badge&logo=solana" alt="Solana"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/x402-Payment%20Protocol-blue?style=for-the-badge" alt="x402"/>
</p>

## The Problem

AI agents need to pay for APIs. But every payment on-chain is **public** - competitors can see:
- What APIs you're using
- How often you call them
- How much you're spending

## The Solution

SPYK Protocol enables **private x402 payments** using zero-knowledge shielded funds:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Shield     │ ──▶ │  Ephemeral  │ ──▶ │   x402      │
│  Funds      │     │  Keypair    │     │   Payment   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
   Private            One-time            No trace
   Pool               Address             On-chain
```

## Quick Start

```bash
npm install @spyk-protocol/sdk
```

```typescript
import { SpykX402Client } from '@spyk-protocol/sdk';

// Pay for API privately
const result = await client.payPrivately({
  amount: '0.001',
  token: 'SOL',
  recipient: 'merchant...'
});
// Your wallet address is NOT visible in the payment!
```

## Features

- 🛡️ **Privacy Cash** - Zero-knowledge shielded pools
- 🔗 **x402 Protocol** - HTTP 402 payment standard
- 🤖 **MCP Integration** - Works with Claude Code
- ⚡ **Solana Speed** - 400ms finality

## Repositories

| Package | Description |
|---------|-------------|
| [spyk-sdk](./spyk-sdk) | Core SDK with privacy protocols |
| [spyk-web](./spyk-web) | Browser demo application |
| [spyk-demo](./spyk-demo) | CLI demonstration |

## Built With

<p>
  <a href="https://privacycash.com"><img src="https://img.shields.io/badge/Privacy%20Cash-ZK%20Shielding-green" alt="Privacy Cash"/></a>
  <a href="https://shadowwire.io"><img src="https://img.shields.io/badge/ShadowWire-Confidential%20Transfers-purple" alt="ShadowWire"/></a>
  <a href="https://helius.xyz"><img src="https://img.shields.io/badge/Helius-RPC%20Infrastructure-orange" alt="Helius"/></a>
  <a href="https://x402.org"><img src="https://img.shields.io/badge/x402-Payment%20Protocol-blue" alt="x402"/></a>
</p>

---

<p align="center">
  <strong>SPYK-402: One SDK, private payments, AI-ready</strong>
</p>
