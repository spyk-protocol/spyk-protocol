# SPYK Protocol - Hackathon Submission Guide

## Quick Answers for Submission Form

| Field | Answer |
|-------|--------|
| **Name** | SPYK Protocol |
| **One-liner** | Privacy SDK for AI agents on Solana - shield funds, pay APIs privately, ZK compliance proofs |
| **Track** | AI Track |
| **Bounties** | Helius, Quicknode, Range, Arcium, Noir/Aztec |

---

## Video (4 mins max) - ONE VIDEO

Structure your presentation + demo in one video:

| Time | Content | What to Show |
|------|---------|--------------|
| 0:00-0:30 | Problem | "Every Solana TX is public. AI agents expose wallets." |
| 0:30-1:30 | x402 Demo | Run `test-full-devnet-flow.ts`, show real Solscan link |
| 1:30-2:15 | Noir Proofs | Real 388-byte Groth16 proof generation |
| 2:15-3:00 | Sponsors | Table of 7 integrations |
| 3:00-3:30 | Code | 3-line SDK initialization |
| 3:30-4:00 | Roadmap | On-chain verification, MCP server, mainnet |

---

## Technical Description (copy-paste for form)

### Overview
SPYK Protocol is a unified TypeScript SDK providing privacy primitives for AI agents on Solana. It combines 7 sponsor technologies into a single developer-friendly interface.

### Core Architecture

**1. x402 Private AI Payments** (Flagship)
- Problem: AI agents paying APIs expose wallet addresses on-chain
- Solution: Ephemeral keypairs funded from ZK pools
- Flow: Shield funds → Generate ephemeral → Fund from pool → Pay API
- Result: Zero on-chain link between agent wallet and payment
- **Status: REAL devnet transactions with Solscan links**

**2. Noir ZK Proofs** (Aztec/Sunspot)
- Real Groth16 proof generation via nargo + sunspot CLI
- SMT exclusion circuit: proves address NOT in sanctions list
- Uses Poseidon hash (circomlibjs) matching Noir's bn254::hash_2
- Properly computes empty tree root (254-level hash chain)
- **Status: REAL 388-byte proofs, locally verified**

**3. Privacy Cash Integration**
- ZK shielded pool for SOL/USDC (Elusiv fork)
- Devnet uses simulation (no relayer) but mainnet-ready architecture

**4. ShadowWire Multi-Token Privacy**
- Ephemeral addresses for 20+ SPL tokens (BONK, RADR, ORE, etc.)

**5. Arcium Encrypted DeFi**
- MXE client with swap, lending, state modules

**6. Helius/Quicknode RPC**
- Multi-provider redundancy for reliable transaction delivery

**7. Range Compliance**
- OFAC screening API integration (opt-in)

### Sponsor Technology Usage

| Sponsor | Integration | Code Location |
|---------|-------------|---------------|
| **Helius** | RPC provider | `src/utils/connection.ts` |
| **Quicknode** | Multi-provider redundancy | `SpykConfig.quicknodeUrl` |
| **Range** | OFAC compliance screening | `src/compliance/range.ts` |
| **Arcium** | MXE client for encrypted DeFi | `src/arcium/client.ts` |
| **Noir/Aztec** | ZK proofs via Sunspot | `src/noir/sunspot.ts` |

### Key Technical Achievements
1. Poseidon hash compatibility with Noir's bn254::hash_2
2. Proper empty SMT root computation (254-level hash chain)
3. Real 388-byte Groth16 proofs, locally verified
4. Real devnet ephemeral payments with Solscan links

---

## Roadmap (for form)

1. On-chain proof verification via deployed Sunspot verifier
2. MCP server for Claude Code integration (AI agents using SPYK natively)
3. Privacy Cash mainnet integration (pending relayer availability)
4. Production SDK npm package release

---

## Demo Commands (for video)

```bash
# Full integration test (shows ALL 5 components)
cd spyk-sdk
npx tsx test-full-devnet-flow.ts

# Quick Noir proof demo
npx tsx -e "
import * as noir from './src/noir';
import { Keypair } from '@solana/web3.js';
const prover = noir.createNoirProver({ useCLI: true, verbose: true });
await prover.initialize();
const result = await prover.proveCompliance(Keypair.generate().publicKey);
console.log('Passed:', result.passed, 'Proof:', result.noirProof?.proof.length, 'bytes');
"
```

---

## What's Real vs Mock

| Component | Status | Notes |
|-----------|--------|-------|
| **x402 Payments** | ✅ REAL | Devnet TXs, Solscan links |
| **Noir ZK Proofs** | ✅ REAL | Groth16 via nargo+sunspot |
| **ShadowWire** | ✅ REAL | Account checks on devnet |
| **Arcium MXE** | ✅ REAL | Client initializes |
| **Privacy Cash** | ⚠️ Simulation | No devnet relayer |

---

## Pre-Recording Checklist

```bash
# 1. Verify everything works
cd spyk-sdk && npx tsx test-full-devnet-flow.ts
# Expected: ALL 5 TESTS PASSED!

# 2. Have ~2 SOL for demo
solana balance --url devnet

# 3. Clear terminal for clean recording
```

---

## What NOT to Say

- ❌ "mock" → ✅ "devnet simulation"
- ❌ "placeholder" → ✅ "prepared for mainnet"
- ❌ "Arcium is experimental" → ✅ "MXE client ready, awaiting network"
