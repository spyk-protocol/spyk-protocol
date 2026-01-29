# SPYK Protocol Demo Script

> 3-Minute Demo Video Script for Solana Privacy Hackathon

## Pre-Demo Setup

### 1. Environment
```bash
cd spyk-demo
cp .env.example .env
```

Edit `.env`:
```env
HELIUS_API_KEY=your_key
WALLET_SECRET_KEY=[1,2,3,...64]
NETWORK=devnet
```

### 2. Fund Wallet
```bash
# Get devnet SOL
solana airdrop 2 --url devnet
```

### 3. Test Run
```bash
pnpm dev balance
```

---

## Demo Script (3 Minutes)

### Opening (0:00 - 0:30)

**[Show terminal]**

> "Every Solana transaction is public. When your AI agent pays for an API, competitors can see exactly which services you use, how much you spend, and track your entire business activity.
>
> SPYK Protocol fixes this. Let me show you."

---

### Part 1: Shield Funds (0:30 - 1:15)

**[Run command]**
```bash
pnpm dev deposit 0.5
```

**[Narrate while loading]**

> "First, we shield SOL into a zero-knowledge pool using Privacy Cash. Watch..."

**[Show output]**
```
🔐 Shielding 0.5 SOL...
✓ Shielded 0.5 SOL!
Transaction: https://solscan.io/tx/...
```

> "These funds are now private. The deposit used ZK proofs - no one can link future withdrawals back to my wallet."

---

### Part 2: x402 Private AI Payment (1:15 - 2:15) ⭐ KEY DEMO

**[Run command]**
```bash
pnpm dev pay https://api.claude.ai/v1/messages --mock
```

**[Narrate while loading]**

> "Now the key feature - x402 private AI payments. Watch how we pay an API without revealing our wallet."

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

📄 Invoice received:
   Amount: 0.001 SOL
   Recipient: DemoAPI...

✅ Private Payment Complete!

━━━ Privacy Summary ━━━
Your wallet:     (hidden)
Ephemeral used:  7xK2abc...
On-chain link:   NONE ✓
```

> "The API got paid, but from a one-time ephemeral address. My real wallet never appears. Competitors see nothing."

---

### Part 3: Show SDK Code (2:15 - 2:40)

**[Show code editor with this snippet]**

```typescript
import { Spyk, noir, SpykArcium } from '@spyk-protocol/sdk';

// Initialize with Helius or Quicknode
const spyk = new Spyk({
  heliusApiKey: process.env.HELIUS_API_KEY,
  wallet: myKeypair,
});

// 1. Privacy Cash - Shield funds
await spyk.deposit('SOL', 1.0);

// 2. ShadowWire - Private transfer
await spyk.transfer({ to: recipient, amount: 0.5, token: 'SOL' });

// 3. x402 - Pay AI API privately
await spyk.x402.payPrivately(invoice);

// 4. Arcium - Encrypted DeFi (hidden amounts)
const arcium = new SpykArcium(config);
await arcium.swap.executePrivate({ amountIn: 100, tokenIn: 'USDC' });

// 5. Noir - ZK compliance proofs
const prover = noir.createNoirProver();
await prover.proveCompliance(address);
```

> "Three lines to add privacy. The SDK integrates Helius, Quicknode, Range compliance, Arcium encrypted DeFi, and Noir ZK proofs."

---

### Part 4: Sponsor Integrations (2:40 - 2:55)

**[Show terminal or slide]**

```
┌─────────────────────────────────────────────┐
│  SPYK Sponsor Integrations                  │
├─────────────────────────────────────────────┤
│  ✓ Helius      - Primary RPC               │
│  ✓ Quicknode   - Multi-provider support    │
│  ✓ Range       - OFAC compliance screening │
│  ✓ Arcium      - Encrypted DeFi (MPC)      │
│  ✓ Noir/Aztec  - ZK proofs on Solana       │
│  ✓ Privacy Cash - ZK shielded pool         │
│  ✓ ShadowWire  - Ephemeral addresses       │
└─────────────────────────────────────────────┘
```

> "We integrate 7 sponsor technologies into one unified SDK."

---

### Closing (2:55 - 3:00)

> "SPYK Protocol: Private AI payments on Solana.
>
> Install with npm, shield your funds, and your business stays private.
>
> Thank you."

**[Show]**
```bash
npm install @spyk-protocol/sdk
```

---

## Backup Commands

If something fails, use these:

```bash
# Check balance
pnpm dev balance

# Interactive mode (guided)
pnpm dev interactive

# Withdraw
pnpm dev withdraw 0.1
```

---

## Key Talking Points

| If Asked About... | Answer |
|-------------------|--------|
| How is this different from mixers? | We use ZK proofs, not pooled mixing. Compliant by design with Range integration. |
| Is it audited? | Privacy Cash and ShadowWire are battle-tested. Noir/Arcium are clearly marked as hackathon integrations. |
| What tokens? | SOL/USDC for Privacy Cash. 20+ tokens for ShadowWire transfers. |
| Mainnet ready? | Yes, Privacy Cash and ShadowWire work on mainnet. Demo uses devnet. |

---

## Screen Layout

```
┌──────────────────────────────────────────────┐
│  Terminal (left 60%)    │  Code (right 40%)  │
│                         │                    │
│  $ pnpm dev deposit 1   │  import { Spyk }   │
│  ✓ Shielded 1 SOL!      │  from '@spyk/sdk'; │
│                         │                    │
│  $ pnpm dev transfer... │  await spyk...     │
│                         │                    │
└──────────────────────────────────────────────┘
```

---

## Post-Demo

Share links:
- GitHub: `github.com/spyk-protocol`
- SDK: `npm install @spyk-protocol/sdk`
- Demo: `github.com/spyk-protocol/spyk-demo`
