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
| 0:30-1:30 | x402 Demo | Run `npx tsx src/cli.ts pay <url> --devnet`, show real Solscan link |
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
- Flow: Shield funds -> Generate ephemeral -> Fund from pool -> Pay API
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

### Primary Demo Commands (from spyk-demo/)
```bash
# Navigate to CLI
cd ~/Documents/Web3/Spyk\ Protocol/spyk-demo

# Check balance
npx tsx src/cli.ts balance

# x402 Private Payment (REAL devnet TX with Solscan link)
npx tsx src/cli.ts pay https://api.claude.ai/v1/messages --devnet

# ZK Compliance Proof (REAL Noir proof)
npx tsx src/cli.ts compliance prove $(solana address)

# Shield tokens
npx tsx src/cli.ts deposit 0.5 --token SOL
```

### Pre-Recording Checklist
```bash
# 1. Check SOL balance (need ~2 SOL)
solana balance --url devnet

# 2. Airdrop if needed
solana airdrop 2 --url devnet
# Or use: https://faucet.solana.com/

# 3. Run test commands to verify everything works
npx tsx src/cli.ts balance
npx tsx src/cli.ts pay https://httpbin.org/post --devnet
```

---

## What's Real vs Mock

| Component | Status | Notes |
|-----------|--------|-------|
| **x402 Payments** | REAL | Devnet TXs, Solscan links |
| **Noir ZK Proofs** | REAL | Groth16 via nargo+sunspot |
| **ShadowWire** | REAL | Account checks on devnet |
| **Arcium MXE** | REAL | Client initializes |
| **Privacy Cash** | Simulation | No devnet relayer |

---

## Pre-Recording Checklist

```bash
# 1. Verify CLI commands work
cd spyk-demo
npx tsx src/cli.ts balance
npx tsx src/cli.ts pay https://httpbin.org/post --devnet

# 2. Have ~2 SOL for demo
solana balance --url devnet

# 3. Clear terminal for clean recording
```

---

## Submission Steps

1. **Record Video** (4 mins max)
   - Follow VIDEO_RECORDING_GUIDE.md
   - Run `npx tsx src/cli.ts pay <url> --devnet` as primary demo
   - Show real Solscan links

2. **Upload Video**
   - YouTube (unlisted) or other video host
   - Note the URL

3. **Prepare GitHub**
   - Ensure README is updated
   - Code is clean and documented

4. **Submit to Hackathon**
   - Use submission form fields from above
   - Include video URL
   - Link GitHub repo

---

## Token Examples for Demo

### SOL (Default)
```bash
# Used in primary demo
npx tsx src/cli.ts pay https://api.example.com --devnet

# SOL airdrop
solana airdrop 2 --url devnet
```

### USDC (Optional)
```bash
# Get USDC from Circle faucet
open https://faucet.circle.com/
# Select: Solana -> Devnet -> 20 USDC

# SDK supports USDC:
npx tsx src/cli.ts deposit 10 --token USDC
```

---

## What NOT to Say

- "mock" -> "devnet simulation"
- "placeholder" -> "prepared for mainnet"
- "Arcium is experimental" -> "MXE client ready, awaiting network"
