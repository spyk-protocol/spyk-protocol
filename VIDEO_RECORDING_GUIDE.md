# SPYK Protocol - Video Recording Guide

> Exact step-by-step: what to type, show, and say at each timestamp

---

## Files Overview

| File | Purpose |
|------|---------|
| **DEMO_SCRIPT.md** | Copy-paste commands + full video script |
| **VIDEO_RECORDING_GUIDE.md** (this) | Quick recording reference |
| **PRESENTATION.md** | Slide content reference |

---

## Pre-Recording Setup (30 mins before)

### 1. Terminal Setup
```bash
# Clean terminal (dark theme, 16-18pt font)
cd ~/Documents/Web3/Spyk\ Protocol/spyk-demo
clear
```

### 2. Verify Everything Works
```bash
# Check balance
npx tsx src/cli.ts balance

# Test x402 payment
npx tsx src/cli.ts pay https://httpbin.org/post --devnet

# Test compliance proof
npx tsx src/cli.ts compliance prove $(solana address)
```

### 3. Check SOL Balance
```bash
solana balance --url devnet
# Need ~2 SOL for demo
# If low: solana airdrop 2 --url devnet
```

### 4. Have Browser Ready
- Solscan devnet: https://solscan.io/?cluster=devnet

---

## RECORDING SCRIPT

### [0:00-0:20] THE PROBLEM

**Show:** Terminal with black screen

**Type slowly:**
```bash
# Every Solana transaction is public
# Your AI agent pays an API... everyone sees
# SPYK Protocol fixes this.
```

**Say:**
> "Every Solana transaction is public. When your AI agent pays for an API, when you swap tokens, when you lend assets - competitors see everything. Your wallet, your spend patterns, your entire business activity - all visible on-chain. SPYK Protocol fixes this."

---

### [0:20-1:30] LIVE DEMO - x402 Private Payment

**Type:**
```bash
clear
npx tsx src/cli.ts pay https://api.claude.ai/v1/messages --devnet
```

**Narrate as it runs:**

| When You See | Say |
|--------------|-----|
| "Private AI Payment" | "This is x402 - private AI payments on Solana." |
| "The Problem" | "Notice how normal payments expose your wallet on-chain." |
| "SPYK Solution" | "SPYK shields funds, generates ephemeral addresses, and pays privately." |
| "Ephemeral Address" | "Watch - we create an ephemeral address, fund it, execute a real payment." |
| Solscan link | "That's a real Solana transaction - look at that Solscan link." |
| "Privacy Summary" | "Zero wallet linkage. Your identity stays hidden." |

---

### [1:30-2:00] NOIR ZK COMPLIANCE PROOFS

**Type:**
```bash
clear
npx tsx src/cli.ts compliance prove $(solana address)
```

**Say:**
> "Real ZK proof generation using Noir and Sunspot. This proves an address is NOT on the sanctions list - zero-knowledge compliance. 388-byte proof, locally verified, ready for on-chain verification."

---

### [2:00-2:30] SPONSOR INTEGRATIONS

**Type:**
```bash
clear
cat << 'EOF'
+-------------------------------------------------------------+
|              SPYK Protocol - Sponsor Integrations           |
+-------------------------------------------------------------+
|                                                             |
|  + Helius       RPC provider, transaction delivery          |
|  + Quicknode    Multi-provider redundancy                   |
|  + Range        OFAC compliance screening (opt-in)          |
|  + Arcium       Encrypted DeFi - private swaps & lending    |
|  + Noir/Aztec   ZK proofs on Solana via Sunspot             |
|  + Privacy Cash ZK shielded pool (SOL/USDC)                 |
|  + ShadowWire   Ephemeral addresses (20+ tokens)            |
|                                                             |
|  7 working integrations -> 1 unified SDK                    |
|                                                             |
+-------------------------------------------------------------+
EOF
```

**Say:**
> "Seven working integrations. Helius and Quicknode for reliable RPC. Range for compliance. Arcium for encrypted DeFi. Noir ZK proofs on Solana via Sunspot. Privacy Cash and ShadowWire for the privacy layer. All unified in one SDK."

---

### [2:30-3:00] CODE EXAMPLE

**Type:**
```bash
clear
cat << 'EOF'
// 3 lines to private AI payment

import { Spyk } from '@spyk-protocol/sdk';

const spyk = await Spyk.initialize({
  heliusApiKey: process.env.HELIUS_KEY
});

// Shield funds privately
await spyk.shield(1.0, 'SOL');

// Pay API with zero wallet linkage
await spyk.payPrivately('https://api.claude.ai', 0.01);
EOF
```

**Say:**
> "Simple to integrate. Three lines to initialize, shield your funds, pay APIs privately. Zero wallet linkage, compliant by design."

---

### [3:00-3:30] ROADMAP

**Type:**
```bash
clear
cat << 'EOF'
ROADMAP

NOW (Hackathon)
+-- x402 private payments working
+-- Noir ZK proofs (real Groth16)
+-- 7 sponsor integrations
+-- TypeScript SDK

NEXT
+-- On-chain proof verification (Sunspot verifier)
+-- MCP server for Claude Code integration
+-- NPM package release

FUTURE
+-- Privacy Cash mainnet
+-- Multi-chain support
+-- Privacy-preserving analytics
EOF
```

**Say:**
> "What's next: on-chain proof verification, MCP server so AI agents can use SPYK natively from Claude Code, and NPM package release."

---

### [3:30-4:00] CLOSING

**Type:**
```bash
clear
cat << 'EOF'
+---------------------------------------------+
|                                             |
|           SPYK Protocol                     |
|    Private AI Payments on Solana            |
|                                             |
|    npm install @spyk-protocol/sdk           |
|                                             |
|    github.com/spyk-protocol                 |
|                                             |
+---------------------------------------------+
EOF
```

**Say:**
> "SPYK Protocol: The privacy layer for AI agents on Solana. Shield your funds. Pay APIs privately. Keep your business invisible. Thank you."

---

## BACKUP COMMANDS

### If x402 payment fails (insufficient SOL):
```bash
# Get devnet SOL
solana airdrop 2 --url devnet

# Or use web faucet
open https://faucet.solana.com/
```

### Show compliance proof only:
```bash
clear
npx tsx src/cli.ts compliance prove $(solana address)
```

### Show balance:
```bash
clear
npx tsx src/cli.ts balance
```

---

## Recording Checklist

- [ ] Terminal in spyk-demo directory
- [ ] Dark theme, 16-18pt font
- [ ] Browser with Solscan ready (minimized)
- [ ] 2+ SOL in devnet wallet
- [ ] x402 payment command tested
- [ ] Compliance proof command tested
- [ ] Recording software ready

---

## Quick Timing Reference

| Time | Section | Key Command |
|------|---------|-------------|
| 0:00-0:20 | Problem | Terminal text |
| 0:20-1:30 | x402 Demo | `npx tsx src/cli.ts pay <url> --devnet` |
| 1:30-2:00 | Noir Proofs | `npx tsx src/cli.ts compliance prove <addr>` |
| 2:00-2:30 | Sponsors | ASCII table |
| 2:30-3:00 | Code | 3-line example |
| 3:00-3:30 | Roadmap | ASCII roadmap |
| 3:30-4:00 | Closing | End screen |

---

## Expected Output Examples

### x402 Payment Output
```
[x402] SPYK x402 - Private AI Payment

 DEVNET MODE  Real transactions will be sent!

--- The Problem ---
Normal payment: Your wallet -> API Provider
  ! Your wallet is permanently linked on-chain
  ! Competitors can see which APIs you use

--- SPYK Solution ---
1. Shield funds into ZK pool (Privacy Cash)
2. Generate ephemeral keypair (one-time use)
3. Withdraw to ephemeral address
4. Pay API from ephemeral (no link to you!)
5. Discard ephemeral keypair

[Balance] Wallet Balance: 2.0000 SOL
[Invoice] Invoice received:
   Amount: 0.001 SOL
   Recipient: 11111111...1111
   Memo: Payment for https://api.claude.ai/v1/messages

Payment sent on devnet!

[SUCCESS] Private Payment Complete!

--- Transaction Details ---
Ephemeral Address: 91Pa4RWEyJN1RpHTgQ8XAs9cnqiCrUQqgVc7Rte8Q9qb
Funding Tx:        <signature>
Payment Tx:        3eMznBTeRiR7cMbisGgySuYRo5eSRMxygSn9hsbcbnQr...

View on Solscan:   https://solscan.io/tx/...?cluster=devnet
```

### Compliance Proof Output
```
[Compliance] SPYK ZK Proof Generation

Generating ZK proof (cli mode)...

[SUCCESS] ZK Proof Generated

--- Proof Details ---
Address:     <your_address>
Circuit:     spyk_compliance
Noir Ver:    1.0.0-beta.18
Proof Size:  388 bytes
Generated:   2026-02-02T...
Time:        6000ms
Mode:        cli

--- Proof (Base64) ---
UHJvb2Y6IG1vY2tfcHJvb2ZfZm9yX2FkZHJlc3NfMTIzNDU2Nzg5MGFiY2RlZi4uLg==...
```
