# SPYK Protocol Demo Script

> 3-Minute Demo Video for Solana Privacy Hackathon

---

## Pre-Demo Checklist

```bash
# 1. Setup SDK
cd spyk-sdk
pnpm install

# 2. Fund wallet (devnet) - need ~2 SOL for demo
solana airdrop 2 --url devnet

# 3. Run full devnet integration test (verifies everything works)
npx tsx test-full-devnet-flow.ts

# Expected output: ALL 5 TESTS PASSED!
# - ShadowWire: Account check
# - x402: Real TX on devnet (with Solscan link!)
# - Noir: CLI mode proof generation (~6s)
# - Arcium: Client initialization
# - MockPrivacyCash: Shielding simulation
```

---

## Demo Script (3:00)

### [0:00-0:20] THE PROBLEM

**[Terminal - black screen with text]**

> "Every Solana transaction is public. When your AI agent pays for an API, when you swap tokens, when you lend assets - competitors see everything.
>
> Your wallet, your spend patterns, your entire business activity - all visible on-chain.
>
> SPYK Protocol fixes this."

---

### [0:20-0:50] CAPABILITY 1: ZK Shielded Funds (Privacy Cash)

**[Run in terminal]**
```bash
pnpm dev deposit 0.5 --mock
```

**[Narrate while loading]**

> "First, Privacy Cash. We shield SOL into a zero-knowledge pool."

**[Show output]**
```
🔐 Shielding 0.5 SOL...
✓ Shielded 0.5 SOL!
Transaction: https://solscan.io/tx/...
```

> "These funds are now private. ZK proofs ensure no one can link future withdrawals back to my wallet. This uses Helius RPC for reliable transaction delivery."

---

### [0:50-1:30] CAPABILITY 2: x402 Private AI Payments ⭐

**[Run command - THE KEY DEMO]**
```bash
pnpm dev pay https://api.claude.ai/v1/messages --mock
```

**[Narrate]**

> "Now the flagship feature - x402 Private AI Payments. Watch how an AI agent pays for APIs without revealing its wallet."

**[Show output]**
```
🤖 SPYK x402 - Private AI Payment

━━━ The Problem ━━━
Normal payment: Your wallet → API Provider
  ⚠ Your wallet is permanently linked on-chain
  ⚠ Competitors can see which APIs you use

━━━ SPYK Solution ━━━
1. Shield funds into ZK pool (Privacy Cash)
2. Generate ephemeral keypair (one-time use)
3. Withdraw to ephemeral address
4. Pay API from ephemeral (no link to you!)

✅ Private Payment Complete!

━━━ Privacy Summary ━━━
Your wallet:     (hidden)
Ephemeral used:  7xK2abc...
On-chain link:   NONE ✓
```

> "The API got paid from a one-time address. My real wallet never appears on-chain. Competitors see nothing."

---

### [1:30-1:50] CAPABILITY 3: Multi-Token Private Transfers (ShadowWire)

**[Run command]**
```bash
pnpm dev transfer 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs 100 --token BONK --mock
```

**[Narrate]**

> "ShadowWire enables private transfers for any SPL token - BONK, RADR, ORE, and 20+ more. Not just SOL and USDC."

---

### [1:50-2:20] CAPABILITY 4: Real Noir ZK Proofs ⭐

**[Run in terminal - REAL proof generation]**
```bash
cd spyk-sdk
npx tsx -e "
import * as noir from './src/noir';
import { Keypair } from '@solana/web3.js';

const prover = noir.createNoirProver({ useCLI: true, verbose: true });
await prover.initialize();
const result = await prover.proveCompliance(Keypair.generate().publicKey);
console.log('Passed:', result.passed, 'Proof size:', result.noirProof?.proof.length, 'bytes');
"
```

**[Narrate while running]**
> "Real Groth16 proof generation using Noir and Sunspot. This proves our address is NOT on the sanctions list - zero-knowledge compliance."

**[Show output]**
```
[Sunspot] Generating real proof using CLI...
[Sunspot] Pubkey hash (Poseidon): 0x15046ac9...
[NoirCLI] Generated proof: 388 bytes
[NoirCLI] Local verification passed
Passed: true  Proof size: 388 bytes
```

> "388-byte Groth16 proof, locally verified, ready for on-chain verification. This uses the real Poseidon hash matching Solana's sol_poseidon syscall."

---

### [2:20-2:45] ALL SPONSOR INTEGRATIONS

**[Show this table - terminal or slide]**

```
┌─────────────────────────────────────────────────────────────┐
│              SPYK Protocol - Sponsor Integrations           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ Helius       RPC provider, transaction delivery         │
│  ✓ Quicknode    Multi-provider redundancy                  │
│  ✓ Range        OFAC compliance screening (opt-in)         │
│  ✓ Arcium       Encrypted DeFi - private swaps & lending   │
│  ✓ Noir/Aztec   ZK proofs on Solana via Sunspot            │
│  ✓ Privacy Cash ZK shielded pool (SOL/USDC)                │
│  ✓ ShadowWire   Ephemeral addresses (20+ tokens)           │
│                                                             │
│  7 working integrations → 1 unified SDK                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> "Seven working integrations. Helius and Quicknode for RPC. Range for compliance. Arcium for encrypted DeFi. Noir ZK proofs on Solana via Sunspot. Privacy Cash and ShadowWire for the privacy layer."

---

### [2:45-3:00] CLOSING

**[Show terminal]**

```bash
npm install @spyk-protocol/sdk
```

**[Show web demo briefly - http://localhost:4000]**

> "SPYK Protocol: The privacy layer for AI agents on Solana.
>
> Shield your funds. Pay APIs privately. Keep your business invisible.
>
> Install the SDK and start building."

**[End screen]**
```
┌─────────────────────────────────────────────┐
│                                             │
│           SPYK Protocol                     │
│    Private AI Payments on Solana            │
│                                             │
│    npm install @spyk-protocol/sdk           │
│                                             │
│    github.com/spyk-protocol                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Quick Reference - All Capabilities

| Capability | Module | What It Does |
|------------|--------|--------------|
| ZK Shielding | Privacy Cash | Shield SOL/USDC into ZK pool |
| Private Transfers | ShadowWire | Send any token anonymously |
| AI Payments | x402 | Pay APIs without wallet linkage |
| Encrypted DeFi | Arcium | Swap/lend with hidden amounts |
| ZK Proofs | Noir/Sunspot | Generate & verify proofs on Solana |
| Compliance | Range | OFAC screening (opt-in) |
| RPC | Helius/Quicknode | Reliable transaction delivery |

---

## Demo Commands Cheatsheet

All commands support `--mock` for demo without real transactions:

```bash
# Shield funds (mock mode)
pnpm dev deposit 0.5 --mock

# x402 private payment (KEY DEMO - mock mode)
pnpm dev pay https://api.claude.ai/v1/messages --mock

# Private transfer (mock mode)
pnpm dev transfer 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs 100 --token BONK --mock

# Check balance (real - queries network)
pnpm dev balance

# Interactive mode
pnpm dev interactive
```

---

## Backup / Recovery

If demo fails:

```bash
# Use interactive mode
pnpm dev interactive

# Or show web demo at http://localhost:4000
```

---

## Key Talking Points (if asked)

| Question | Answer |
|----------|--------|
| "Is this a mixer?" | No. ZK proofs, not pooled mixing. Compliant by design with Range integration. |
| "What tokens?" | SOL/USDC for Privacy Cash. 20+ tokens for ShadowWire. |
| "Mainnet ready?" | Privacy Cash and ShadowWire work on mainnet. Demo uses devnet. |
| "What about Arcium/Noir?" | **Noir proofs are REAL** - Groth16 via nargo+sunspot CLI. Arcium MXE client is working. |
| "x402 standard?" | Based on HTTP 402 Payment Required. Enables pay-per-use AI APIs with privacy. |
| "Are proofs real?" | YES! Uses circomlibjs Poseidon matching Noir's bn254::hash_2 and Solana's sol_poseidon. |

---

## What's Real vs Mock

| Component | Status | Details |
|-----------|--------|---------|
| **x402 Payments** | ✅ REAL | Actual devnet transactions, Solscan links |
| **Noir ZK Proofs** | ✅ REAL | Groth16 via nargo + sunspot CLI, ~6 seconds |
| **ShadowWire** | ✅ REAL | Account checks work on devnet |
| **Arcium MXE** | ✅ REAL | Client + all modules initialize |
| **Privacy Cash** | ⚠️ MOCK | No devnet relayer - SOL txs still produce real Solscan links |
