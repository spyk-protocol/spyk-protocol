# SPYK Protocol - Quick Demo Guide

> Step-by-step commands to demo all capabilities and bounties

---

## Quick Setup (2 minutes)

```bash
# 1. Clone and install
cd spyk-demo
pnpm install

# 2. Configure (Helius pre-configured for demo)
cp .env.example .env
# Edit: Add WALLET_SECRET_KEY=[your 64-byte array]

# 3. Fund wallet (see Faucet section below)
node dist/cli.mjs faucet --token SOL

# 4. Build
pnpm build

# 5. Verify
node dist/cli.mjs balance
```

---

## Demo 1: CLI Demo (Recommended for Video)

### 1.1 Privacy Cash - Shield Funds ($15k bounty)

```bash
# Mock mode (instant, no SOL needed)
node dist/cli.mjs deposit 0.5 --mock

# Real devnet (uses actual SOL)
node dist/cli.mjs deposit 0.1
```

**What it shows:** ZK shielding SOL into private pool

---

### 1.2 x402 Private AI Payment ($5k+ bounty)

```bash
# Mock mode (instant demo)
node dist/cli.mjs pay https://api.claude.ai/v1/messages --mock

# Real devnet transaction (shows on Solscan!)
node dist/cli.mjs pay https://api.example.com/premium --devnet -a 0.001
```

**What it shows:**
- Ephemeral keypair generation
- Payment from one-time address
- Wallet never linked on-chain

---

### 1.3 ShadowWire - Multi-Token Transfer ($15k Radr bounty)

```bash
# Mock mode
node dist/cli.mjs transfer 7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs 100 --token BONK --mock

# Supported tokens: SOL, USDC, BONK, RADR, ORE, JIM, GODL (20+ total)
```

**What it shows:** Private transfers for any SPL token

---

### 1.4 Check Balances

```bash
# All balances
node dist/cli.mjs balance

# Specific token
node dist/cli.mjs balance --token BONK
```

---

## Demo 2: Web Demo

### Setup

```bash
cd spyk-web
pnpm install
pnpm dev
# Open http://localhost:4000
```

### Demo Flow

1. **Connect Wallet** - Click "Connect" (Phantom on devnet)
2. **x402 Payment** - Click "Pay Privately" button
3. **Watch Steps** - See ephemeral flow animate
4. **Privacy Summary** - Shows broken on-chain link

---

## Demo 3: Claude Code MCP Demo (AI Agent)

This shows Claude autonomously paying for APIs!

### Setup

```bash
# 1. Build MCP server
cd spyk-sdk/mcp
pnpm install
pnpm build
```

### Configure Claude Code

Add to `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "spyk": {
      "command": "node",
      "args": ["/full/path/to/spyk-sdk/mcp/dist/index.js"],
      "env": {
        "SPYK_NETWORK": "devnet",
        "SPYK_PRIVATE_KEY": "base58_encoded_private_key",
        "HELIUS_API_KEY": "564aed68-fda0-4c81-a63c-eab043f99fb6"
      }
    }
  }
}
```

### Demo Commands (ask Claude)

```
"Check my SPYK balance"
→ Claude calls spyk_balance tool

"Shield 0.1 SOL into private pool"
→ Claude calls spyk_shield tool

"Pay for https://api.example.com/premium privately"
→ Claude calls spyk_pay tool (handles 402 Payment Required)
```

### MCP Tools Available

| Tool | Description |
|------|-------------|
| `spyk_balance` | Check shielded + public balance |
| `spyk_shield` | Deposit into ZK pool |
| `spyk_pay` | Pay x402 API privately |

---

## Bounty Demo Commands

### Helius ($5k) - RPC Provider
```bash
# Already using Helius by default
node dist/cli.mjs pay https://api.example.com --devnet -a 0.001
# Shows: "Transaction delivered via Helius RPC"
```

### Privacy Cash ($15k) - ZK Shielding
```bash
node dist/cli.mjs deposit 0.5 --mock
node dist/cli.mjs withdraw 0.2 --mock
node dist/cli.mjs balance
```

### ShadowWire/Radr ($15k) - Multi-Token Privacy
```bash
node dist/cli.mjs transfer <address> 1000 --token BONK --mock
node dist/cli.mjs transfer <address> 50 --token RADR --mock
```

### Noir/Aztec ($10k) - ZK Proofs on Solana
```bash
# Real proof generation (from spyk-demo/)
cd spyk-demo
npx tsx src/cli.ts compliance prove $(solana address)

# Shows:
# - Circuit: spyk_compliance
# - Noir Ver: 1.0.0-beta.18
# - Proof Size: 388 bytes
# - Mode: cli
```

### Arcium ($10k) - Encrypted DeFi
```bash
# Private swap quote (from spyk-demo/)
cd spyk-demo
npx tsx src/cli.ts swap quote 100 USDC SOL

# Shows: Arcium MXE client with encrypted order parameters
```

### x402 Protocol - Private AI Payments
```bash
# THE KEY DEMO - real transaction
node dist/cli.mjs pay https://api.claude.ai/v1/messages --devnet -a 0.001

# Shows ephemeral payment flow with Solscan link
```

---

## Real Devnet Evidence

All these transactions are verifiable on Solscan:

| Feature | Transaction |
|---------|-------------|
| x402 Payment | [View on Solscan](https://solscan.io/tx/5VttuKkTHacsszzk5zLUSUficafcm3GYuQ5wHbLWxqF5ZqfpTGVwbT5HWMLL7UStxediWHAEwxD67uDSSnWXD5NU?cluster=devnet) |
| Noir Proof Verified | [View on Solscan](https://solscan.io/tx/2ASDsanFgadFCG5Ncn1f2dhDWutGybUNjSPE1W3sixdPDvkNUtaVG2aZ2NpDLqmnVBdeQ4TaH49q7ox5zmmCVhdp?cluster=devnet) |

---

## Getting Devnet Tokens (Faucet)

### SOL - For transaction fees
```bash
# CLI airdrop
node dist/cli.mjs faucet --token SOL --amount 2

# Or use web faucet (if rate-limited)
# https://faucet.solana.com/
```

### USDC - Circle's Official Devnet USDC
```bash
# Shows faucet URL, current balance, and multi-wallet strategy
node dist/cli.mjs faucet --token USDC
```

**Faucet:** https://faucet.circle.com/ (20 USDC per 2 hours)

**Need more than 20 USDC?** Use multiple wallets:
```bash
# 1. Create temp wallets
solana-keygen new -o /tmp/temp1.json --no-bip39-passphrase
solana-keygen new -o /tmp/temp2.json --no-bip39-passphrase

# 2. Faucet 20 USDC to each at https://faucet.circle.com/

# 3. Transfer to your main wallet
spl-token transfer 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 20 <YOUR_WALLET> \
  --owner /tmp/temp1.json --url devnet --allow-unfunded-recipient --fund-recipient
```

**Note:** MockPrivacyCash sends **real devnet transactions** viewable on Solscan with memo `SPYK-MOCK-PC:SHIELD:...`

---

## Troubleshooting

### "Insufficient balance"
```bash
node dist/cli.mjs faucet --token SOL --amount 2
# Or: https://faucet.solana.com/
```

### "HELIUS_API_KEY required"
```bash
# Check .env has the key
cat .env | grep HELIUS
```

### Mock vs Real
- `--mock` = Simulated, instant, no SOL needed
- `--devnet` = Real transaction, needs funded wallet
- No flag = Uses real Privacy Cash (mainnet only)

---

## 3-Minute Video Script

| Time | Action | Command |
|------|--------|---------|
| 0:00 | Intro - "The Problem" | (narrate) |
| 0:20 | Privacy Cash deposit | `deposit 0.5 --mock` |
| 0:50 | x402 Payment | `pay https://api.claude.ai --mock` |
| 1:30 | ShadowWire transfer | `transfer <addr> 100 --token BONK --mock` |
| 2:00 | Show SDK code | (VS Code) |
| 2:30 | Sponsor integrations | (show table) |
| 2:50 | Closing + install | `npm install @spyk-protocol/sdk` |

---

## Links

- **SDK**: `npm install @spyk-protocol/sdk`
- **Demo CLI**: `./spyk-demo`
- **Web Demo**: `./spyk-web`
- **MCP Server**: `./spyk-sdk/mcp`
