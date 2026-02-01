# Next Session: Real Devnet Flow Testing

## Objective
Run the complete SPYK privacy flow on Solana devnet with real transactions.

---

## Prerequisites (Already Done)
- [x] Rust 1.93.0 installed
- [x] Anchor CLI 0.32.1 installed
- [x] Solana CLI 2.1.0 installed
- [x] noir_verifier deployed: `9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t`
- [x] SDK updated with program ID

---

## Real Devnet Flow to Execute

### 1. Setup & Fund Wallet
```bash
cd spyk-demo

# Check wallet
pnpm dev balance

# Get devnet SOL if needed
pnpm dev faucet --token SOL --amount 2

# Get devnet USDC (Circle faucet)
pnpm dev faucet --token USDC
```

### 2. Privacy Cash - Real Shield/Unshield
```bash
# Shield SOL into private pool (REAL tx)
pnpm dev deposit 0.1

# Check shielded balance
pnpm dev balance

# Unshield to another address (REAL tx)
pnpm dev withdraw 0.05 -d <destination_address>
```

**Expected Solscan proof:** Real SOL transfer with SPYK memo

### 3. x402 Private AI Payment - Real Flow
```bash
# Execute REAL x402 payment on devnet
pnpm dev pay https://api.example.com --devnet -a 0.001 -r <recipient>
```

**Expected:**
1. Ephemeral keypair generated
2. Funding tx: Wallet → Ephemeral (Solscan link #1)
3. Payment tx: Ephemeral → Recipient (Solscan link #2)
4. No on-chain link between your wallet and payment

### 4. Noir ZK Compliance - Real Proof Generation
```bash
# Check if nargo is installed
nargo --version

# If not installed:
curl -L noirup.dev | bash
noirup

# Generate REAL ZK proof (requires nargo)
pnpm dev compliance prove <your_wallet_address> -o proof.json

# Verify on-chain using deployed verifier
pnpm dev compliance verify proof.json --on-chain
```

**Note:** If nargo not available, use `--mock` for demo purposes.

### 5. Arcium Private Swap (Mock - MXE not deployed)
```bash
# Get quote (works)
pnpm dev swap quote 100 USDC SOL

# Execute swap (mock mode - Arcium MXE not on devnet yet)
pnpm dev swap execute 100 USDC SOL --mock
```

---

## Full Demo Script (Copy-Paste Ready)

```bash
# === SPYK DEVNET DEMO ===
cd /Users/ammar.robb/Documents/Web3/Spyk\ Protocol/spyk-demo

# 1. Check balance
pnpm dev balance

# 2. Shield 0.1 SOL (REAL tx)
pnpm dev deposit 0.1

# 3. x402 payment (REAL tx)
pnpm dev pay https://api.claude.ai/v1/messages --devnet -a 0.001

# 4. Compliance check (mock or real)
pnpm dev compliance check $(solana address) --mock

# 5. Show Solscan links
echo "Check transactions at: https://solscan.io/?cluster=devnet"
```

---

## Verified Transactions from This Session

| Feature | Tx Signature | Solscan |
|---------|--------------|---------|
| Privacy Cash Deposit | `54ADKUCyRVKaPGN16KxrhGimJtXGcRRzsH8QWRvxt2xstn3mTtinaTPP1P1rQUvwcncAyhD34rYzY79TqHW7rjcH` | [View](https://solscan.io/tx/54ADKUCyRVKaPGN16KxrhGimJtXGcRRzsH8QWRvxt2xstn3mTtinaTPP1P1rQUvwcncAyhD34rYzY79TqHW7rjcH?cluster=devnet) |
| x402 Funding | `5A9y4gbfaQn9cxHCHwB5LZ2euaKzdE59ByXfKHs4YSvWPm8wXMhNVWgE9PyYW4zpyjMakGwkr4TUhU66QQUawgT4` | [View](https://solscan.io/tx/5A9y4gbfaQn9cxHCHwB5LZ2euaKzdE59ByXfKHs4YSvWPm8wXMhNVWgE9PyYW4zpyjMakGwkr4TUhU66QQUawgT4?cluster=devnet) |
| x402 Payment | `StS5XjpSGSPts16GG8DBNhMw38QK5hKVASUVrGJD3JeJuGZ3yuTxoC69sDq6quzNfqdxp9tJtAVMWnDvNHXyDJa` | [View](https://solscan.io/tx/StS5XjpSGSPts16GG8DBNhMw38QK5hKVASUVrGJD3JeJuGZ3yuTxoC69sDq6quzNfqdxp9tJtAVMWnDvNHXyDJa?cluster=devnet) |
| Verifier Deploy | `2dcUv5BiFKdR71dQHpULoMDbXddWHFjugAF5hyEtYNp6nix4PYNZroD82NwvR2EhVesVxp99e1EazBYR3PveqVxn` | [View](https://solscan.io/tx/2dcUv5BiFKdR71dQHpULoMDbXddWHFjugAF5hyEtYNp6nix4PYNZroD82NwvR2EhVesVxp99e1EazBYR3PveqVxn?cluster=devnet) |

---

## Deployed Programs

| Program | Address | Network |
|---------|---------|---------|
| noir_verifier | `9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t` | Devnet |

---

## What's Real vs Mock

| Feature | Real Devnet | Mock Mode |
|---------|-------------|-----------|
| Privacy Cash deposit | ✅ `pnpm dev deposit 0.1` | `--mock` flag |
| Privacy Cash withdraw | ✅ `pnpm dev withdraw 0.05` | `--mock` flag |
| x402 payment | ✅ `--devnet` flag | `--mock` flag |
| Noir compliance | ✅ Requires nargo | `--mock` flag |
| Arcium swap | ❌ MXE not deployed | `--mock` only |

---

## Next Session Tasks

1. [ ] Run full deposit → x402 payment flow
2. [ ] Install nargo and test real ZK proof generation
3. [ ] Test on-chain Noir verification with deployed verifier
4. [ ] Record demo video with all Solscan proofs
5. [ ] Optional: Deploy Arcium MXE for real swaps

---

## Quick Start Next Session

```bash
# Load this context
cat .claude/NEXT_SESSION_DEVNET_FLOW.md

# Or use beads
bd ready
bd show tk-b6y.13  # Demo video task
```
