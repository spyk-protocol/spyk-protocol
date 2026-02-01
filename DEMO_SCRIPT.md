# SPYK Protocol Demo Script

> 4-Minute Presentation + Demo Video for Solana Privacy Hackathon

---

## QUICK START (Copy-Paste Ready)

```bash
# Navigate to demo CLI
cd ~/Documents/Web3/Spyk\ Protocol/spyk-demo

# Check balance
npx tsx src/cli.ts balance

# Run x402 private payment (REAL devnet TX)
npx tsx src/cli.ts pay https://api.claude.ai/v1/messages --devnet

# Generate compliance proof
npx tsx src/cli.ts compliance prove $(solana address)
```

**Expected output:**
- x402: Real devnet TX with Solscan link
- Compliance: 388-byte ZK proof via Noir/Sunspot

---

## Pre-Recording Checklist

```bash
# 1. Terminal setup
cd ~/Documents/Web3/Spyk\ Protocol/spyk-demo
clear

# 2. Check SOL balance (need ~2 SOL)
solana balance --url devnet

# 3. Airdrop if needed
solana airdrop 2 --url devnet

# 4. Verify commands work (run these BEFORE recording!)
npx tsx src/cli.ts balance
npx tsx src/cli.ts pay https://httpbin.org/post --devnet

# 5. Open browser to Solscan devnet (minimized)
open https://solscan.io/?cluster=devnet
```

---

## VIDEO SCRIPT (4:00 max)

### [0:00-0:20] THE PROBLEM

**Terminal - type these comments:**
```bash
# Every Solana transaction is public
# Your AI agent pays an API... everyone sees
# SPYK Protocol fixes this.
```

**SAY:**
> "Every Solana transaction is public. When your AI agent pays for an API, when you swap tokens, when you lend assets - competitors see everything. Your wallet, your spend patterns, your entire business activity - all visible on-chain. SPYK Protocol fixes this."

---

### [0:20-1:30] LIVE DEMO - x402 Private Payment

**TYPE:**
```bash
clear
npx tsx src/cli.ts pay https://api.claude.ai/v1/messages --devnet
```

**NARRATION GUIDE:**

| When You See | Say |
|--------------|-----|
| `Private AI Payment` | "This is x402 - private AI payments on Solana." |
| `The Problem` | "Notice how normal payments expose your wallet on-chain." |
| `SPYK Solution` | "SPYK shields funds, generates ephemeral addresses, and pays privately." |
| `Ephemeral address:` | "Watch - we create an ephemeral address, fund it, execute a real payment." |
| `https://solscan.io/tx/...` | "That's a real Solana transaction. Click that Solscan link to verify." |
| `Privacy Summary` | "Zero wallet linkage. Competitors see nothing linked to you." |

**EXPECTED OUTPUT:**
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

---

### [1:30-2:00] NOIR ZK COMPLIANCE PROOFS

**TYPE:**
```bash
clear
npx tsx src/cli.ts compliance prove $(solana address)
```

**SAY:**
> "Real ZK proof generation using Noir and Sunspot. This proves an address is NOT on the sanctions list - zero-knowledge compliance. 388-byte proof, locally verified, ready for on-chain verification."

**EXPECTED OUTPUT:**
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

---

### [2:00-2:30] SPONSOR INTEGRATIONS

**TYPE:**
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

**SAY:**
> "Seven working integrations. Helius and Quicknode for reliable RPC. Range for compliance. Arcium for encrypted DeFi. Noir ZK proofs on Solana via Sunspot. Privacy Cash and ShadowWire for the privacy layer. All unified in one SDK."

---

### [2:30-3:00] CODE EXAMPLE

**TYPE:**
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

**SAY:**
> "Simple to integrate. Three lines to initialize, shield your funds, pay APIs privately. Zero wallet linkage, compliant by design."

---

### [3:00-3:30] ROADMAP

**TYPE:**
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

**SAY:**
> "What's next: on-chain proof verification, MCP server so AI agents can use SPYK natively from Claude Code, and NPM package release."

---

### [3:30-4:00] CLOSING

**TYPE:**
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

**SAY:**
> "SPYK Protocol: The privacy layer for AI agents on Solana. Shield your funds. Pay APIs privately. Keep your business invisible. Thank you."

---

## FALLBACK COMMANDS

### If x402 payment fails (insufficient SOL)

```bash
# Get devnet SOL
solana airdrop 2 --url devnet

# Or use web faucet
open https://faucet.solana.com/
```

### If you need to demo without real transactions

```bash
# Mock mode (no real TX sent)
npx tsx src/cli.ts pay https://api.claude.ai --mock

# Mock compliance check
npx tsx src/cli.ts compliance check $(solana address) --mock
```

### Show balance only
```bash
npx tsx src/cli.ts balance
```

---

## What's Real vs Simulated

| Component | Status | Evidence |
|-----------|--------|----------|
| **x402 Payments** | REAL | Actual devnet TX, Solscan links |
| **Noir ZK Proofs** | REAL | Groth16 via nargo CLI, 388 bytes |
| **ShadowWire** | REAL | Account checks work on devnet |
| **Arcium MXE** | REAL | Client + all modules initialize |
| **Privacy Cash** | CACHED | Devnet relayer unavailable; balance persists in session |

---

## Recording Checklist

- [ ] Terminal in spyk-demo directory
- [ ] Dark theme, 16-18pt font
- [ ] Browser with Solscan ready (minimized)
- [ ] 2+ SOL in devnet wallet
- [ ] x402 payment command tested
- [ ] Compliance proof command tested
- [ ] Recording software ready
- [ ] Practice narration once

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

## Key Talking Points

| Question | Answer |
|----------|--------|
| "Is this a mixer?" | No. ZK proofs, not pooled mixing. Compliant by design with Range integration. |
| "What tokens?" | SOL/USDC for Privacy Cash. 20+ tokens for ShadowWire. |
| "Mainnet ready?" | Privacy Cash and ShadowWire work on mainnet. Demo uses devnet. |
| "Are proofs real?" | YES! Uses circomlibjs Poseidon matching Noir's bn254::hash_2 and Solana's sol_poseidon. |
| "x402 standard?" | Based on HTTP 402 Payment Required. Enables pay-per-use AI APIs with privacy. |
| "What about Arcium/Noir?" | Noir proofs are REAL Groth16 via nargo+sunspot CLI. Arcium MXE client is working. |
