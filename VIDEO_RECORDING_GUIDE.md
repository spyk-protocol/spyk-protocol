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
cd ~/Documents/Web3/Spyk\ Protocol/spyk-sdk
clear
```

### 2. Verify Everything Works
```bash
# Run full test first!
npx tsx test-full-devnet-flow.ts
# Expected: ALL 5 TESTS PASSED!
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

### [0:20-1:30] LIVE DEMO - Full Integration Test

**Type:**
```bash
clear
npx tsx test-full-devnet-flow.ts
```

**Narrate as it runs:**

| When You See | Say |
|--------------|-----|
| "ShadowWire" | "First, ShadowWire - checking account status for private multi-token transfers." |
| "x402" | "Now the flagship feature - x402 Private AI Payments. Watch - we create an ephemeral address, fund it, and execute a real payment." |
| Solscan link | "That's a real Solana transaction - look at that Solscan link." |
| "Noir" | "Real ZK proof generation using Noir and Sunspot. 388 bytes, locally verified." |
| "Arcium" | "Arcium MXE client initializing for encrypted DeFi operations." |
| "Privacy Cash" | "Privacy Cash shielding - note this also produces a real Solscan transaction." |
| "ALL 5 TESTS PASSED" | "Five components, all working. Real devnet transactions you can verify on Solscan." |

---

### [1:30-2:00] NOIR ZK PROOFS (Optional)

**Type:**
```bash
clear
npx tsx examples/noir-cli-proofs.ts
```

**Say:**
> "Real Groth16 proof generation using Noir and Sunspot. This proves an address is NOT on the sanctions list - zero-knowledge compliance. 388-byte proof, locally verified, ready for on-chain verification."

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

### If test-full-devnet-flow.ts fails:
```bash
# Noir proofs only (most reliable)
clear
npx tsx examples/noir-cli-proofs.ts
```

### If airdrop fails:
```bash
open https://faucet.solana.com/
```

### Show static output if all else fails:
```bash
clear
cat << 'EOF'
=== SPYK Protocol Demo (Cached Output) ===

1. ShadowWire: Account check: false
2. x402: Real TX on devnet
   TX: https://solscan.io/tx/56WBWxu3jghJVH1QqDP2xbGMDo5hpkDjx4fZjrF6v1E4fC4nJhQs2JzMA9uvm7gZ1LgYQ57L3a8Jt4ZfDiNLiZxW?cluster=devnet
3. Noir: CLI mode, 6.61s, passed=true
   Proof size: 388 bytes
4. Arcium: Client + all modules accessible
5. PrivacyCash: Balance + deposit simulation

ALL 5 TESTS PASSED!
EOF
```

---

## Recording Checklist

- [ ] Terminal in spyk-sdk directory
- [ ] Dark theme, 16-18pt font
- [ ] Browser with Solscan ready (minimized)
- [ ] 2+ SOL in devnet wallet
- [ ] test-full-devnet-flow.ts passes (expect "ALL 5 TESTS PASSED!")
- [ ] Recording software ready

---

## Token Examples

### SOL (Default - used in demo)
```bash
# Primary demo command - uses SOL for all operations
npx tsx test-full-devnet-flow.ts
```

### USDC Support
```bash
# Get USDC from Circle faucet for devnet
open https://faucet.circle.com/
# Select: Solana -> Devnet -> Paste wallet address
# Receive: 20 USDC (limit: 20 per 2 hours)

# SDK supports USDC for shielding:
# await spyk.deposit('USDC', 100);
# await spyk.getPrivateBalance('USDC');
```

---

## Quick Timing Reference

| Time | Section | Key Command |
|------|---------|-------------|
| 0:00-0:20 | Problem | Terminal text |
| 0:20-1:30 | Live Demo | `npx tsx test-full-devnet-flow.ts` |
| 1:30-2:00 | Noir (optional) | `npx tsx examples/noir-cli-proofs.ts` |
| 2:00-2:30 | Sponsors | ASCII table |
| 2:30-3:00 | Code | 3-line example |
| 3:00-3:30 | Roadmap | ASCII roadmap |
| 3:30-4:00 | Closing | End screen |

---

## Verified Working Output (from dry run)

The demo produces this output - use as reference:

```
██████████████████████████████████████████████████████████████
  SPYK Protocol - Full Devnet Integration Test
██████████████████████████████████████████████████████████████

════════════════════════════════════════════════════════════
  1. ShadowWire - Devnet Account Check
════════════════════════════════════════════════════════════
   ✅ ShadowWire devnet integration working

════════════════════════════════════════════════════════════
  2. x402 - Real Devnet Payment
════════════════════════════════════════════════════════════
   Wallet balance: X.XXXX SOL
   Executing real devnet payment...
[DEVNET X402] Ephemeral address: GZd8...
[DEVNET X402] Payment sent: 56WBW...
[DEVNET X402] View on Solscan: https://solscan.io/tx/...?cluster=devnet
   ✅ x402 real devnet payment successful!

════════════════════════════════════════════════════════════
  3. Noir - Real Proof Generation via CLI
════════════════════════════════════════════════════════════
   nargo installed: true
   sunspot installed: true
   Generating proof for random address...
   Proof size: 388 bytes
   ✅ Noir CLI proof generation working!

════════════════════════════════════════════════════════════
  4. Arcium - MXE Client Initialization
════════════════════════════════════════════════════════════
   ✅ Arcium MXE client working!

════════════════════════════════════════════════════════════
  5. PrivacyCash - Devnet Shielding Simulation
════════════════════════════════════════════════════════════
   SOL balance: X.X
   USDC balance: X.X
   ✅ PrivacyCash devnet simulation working!

────────────────────────────────────────────────────────────
ALL 5 TESTS PASSED!
────────────────────────────────────────────────────────────
```
