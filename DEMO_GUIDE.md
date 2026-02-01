# SPYK Protocol - Devnet Demo Guide

> Verified working commands on Solana devnet with real transaction proofs

---

## Quick Start (Recommended for Demo)

```bash
# Navigate to demo CLI directory
cd ~/Documents/Web3/Spyk\ Protocol/spyk-demo

# Check balance
npx tsx src/cli.ts balance

# x402 Private Payment (REAL devnet TX)
npx tsx src/cli.ts pay https://api.claude.ai/v1/messages --devnet

# ZK Compliance Proof
npx tsx src/cli.ts compliance prove $(solana address)
```

---

## Prerequisites

### 1. Wallet Setup

```bash
# Create a devnet wallet (or use existing)
solana-keygen new -o ~/.config/solana/devnet.json --no-bip39-passphrase

# Get the public key
solana address -k ~/.config/solana/devnet.json
```

### 2. Environment Configuration

```bash
cd spyk-demo
cp .env.example .env
```

Edit `.env`:
```bash
# RPC Provider (one required)
HELIUS_API_KEY=your_helius_api_key

# Wallet - export as JSON array
WALLET_SECRET_KEY=[1,2,3,...,64]  # 64-byte secret key

# Network
NETWORK=devnet
```

### 3. Build

```bash
cd spyk-demo
pnpm install
pnpm build
```

---

## Getting Devnet Tokens

### SOL Airdrop

```bash
# CLI airdrop (up to 2 SOL)
npx tsx src/cli.ts faucet --token SOL --amount 2

# Alternative: Web faucet (up to 5 SOL)
# https://faucet.solana.com/
```

**Expected output:**
```
Requesting 2 SOL airdrop...
Received 2 SOL!
  New balance: 4.5000 SOL
  Tx: https://solscan.io/tx/...?cluster=devnet
```

### USDC (Circle Official Devnet)

```bash
# Shows faucet instructions and your wallet address
npx tsx src/cli.ts faucet --token USDC
```

**Steps:**
1. Go to https://faucet.circle.com/
2. Select "Solana" -> "Devnet"
3. Paste your wallet address
4. Receive 20 USDC (limit: 20 per 2 hours per address)

---

## Privacy Cash (ZK Shielding)

Deposit and withdraw SOL/USDC via zero-knowledge pool.

### Deposit (Shield)

```bash
# Shield 0.1 SOL into private pool
npx tsx src/cli.ts deposit 0.1

# With mock mode (no real transaction)
npx tsx src/cli.ts deposit 0.5 --mock
```

**Expected output (real devnet):**
```
Shielding 0.1 SOL...
Successfully shielded 0.1 SOL!
Transaction: https://solscan.io/tx/...?cluster=devnet
```

### Withdraw (Unshield)

```bash
# Unshield 0.05 SOL from private pool
npx tsx src/cli.ts withdraw 0.05

# With destination address
npx tsx src/cli.ts withdraw 0.05 -d <recipient_address>
```

### Check Balance

```bash
npx tsx src/cli.ts balance
```

---

## x402 Private AI Payments

Pay APIs privately using ephemeral keypairs. Your wallet is never linked on-chain.

### Real Devnet Payment

```bash
# Execute real devnet transaction
npx tsx src/cli.ts pay https://api.example.com/premium --devnet -a 0.001
```

**Expected output:**
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
   Memo: Payment for https://api.example.com/premium

Payment sent on devnet!

[SUCCESS] Private Payment Complete!

--- Transaction Details ---
Ephemeral Address: 91Pa4RWEyJN1RpHTgQ8XAs9cnqiCrUQqgVc7Rte8Q9qb
Funding Tx:        <signature>
Payment Tx:        3eMznBTeRiR7cMbisGgySuYRo5eSRMxygSn9hsbcbnQr...

View on Solscan:   https://solscan.io/tx/...?cluster=devnet
```

### Mock Mode (Demo without SOL)

```bash
npx tsx src/cli.ts pay https://api.claude.ai/v1/messages --mock
```

### With Custom Recipient

```bash
npx tsx src/cli.ts pay https://api.example.com --devnet -a 0.001 -r <recipient_address>
```

---

## Noir ZK Compliance Proofs

Generate and verify zero-knowledge proofs that an address is not sanctioned.

### Check Compliance

```bash
# Check if address is compliant (mock mode - no nargo required)
npx tsx src/cli.ts compliance check <solana_address> --mock
```

**Expected output:**
```
[Compliance] SPYK ZK Compliance Check

Checking address (mock mode)...

[PASSED] Address is NOT on sanctions list

Address:    <your_address>
Checked at: 2026-02-01T12:00:00.000Z
Confidence: 100%

Proof generated (388 bytes)
Use `spyk compliance prove` to get full proof data
```

### Generate Proof

```bash
# Generate ZK proof (real mode with nargo)
npx tsx src/cli.ts compliance prove <solana_address>

# Mock mode (no nargo required)
npx tsx src/cli.ts compliance prove <solana_address> --mock

# Save proof to file
npx tsx src/cli.ts compliance prove <solana_address> -o proof.json
```

**Expected output:**
```
[Compliance] SPYK ZK Proof Generation

Generating ZK proof (cli mode)...

[SUCCESS] ZK Proof Generated

--- Proof Details ---
Address:     <your_address>
Circuit:     spyk_compliance
Noir Ver:    1.0.0-beta.18
Proof Size:  388 bytes
Generated:   2026-02-01T12:00:00.000Z
Time:        6000ms
Mode:        cli

--- Proof (Base64) ---
UHJvb2Y6IG1vY2tfcHJvb2ZfZm9yX2FkZHJlc3NfMTIzNDU2Nzg5MGFiY2RlZi4uLg==...
(520 chars total)

Tip: Use -o <file> to save full proof to a file
```

### Verify Proof

```bash
# Verify proof locally (mock mode)
npx tsx src/cli.ts compliance verify proof.json --mock

# Verbose output
npx tsx src/cli.ts compliance verify proof.json --mock -v
```

---

## Arcium Private DeFi

Encrypted swaps and lending with hidden amounts. MXE (Multi-party eXecution Environment) not yet deployed.

### Get Swap Quote

```bash
npx tsx src/cli.ts swap quote 100 USDC SOL
```

### Execute Swap (Mock)

```bash
npx tsx src/cli.ts swap execute 100 USDC SOL --mock
```

### Private Lending

```bash
# Deposit to lending pool
npx tsx src/cli.ts lend deposit 100 USDC --mock

# View position
npx tsx src/cli.ts lend position

# Withdraw
npx tsx src/cli.ts lend withdraw 50 USDC --mock
```

---

## Command Summary

| Command | Description | Mode |
|---------|-------------|------|
| `npx tsx src/cli.ts faucet` | Get devnet SOL/USDC | Real |
| `npx tsx src/cli.ts deposit 0.1` | Shield SOL to private pool | Real |
| `npx tsx src/cli.ts withdraw 0.1` | Unshield from private pool | Real |
| `npx tsx src/cli.ts balance` | Check balances | Real |
| `npx tsx src/cli.ts pay <url> --devnet` | Private x402 payment | Real |
| `npx tsx src/cli.ts pay <url> --mock` | Simulated payment | Mock |
| `npx tsx src/cli.ts compliance check <addr>` | Check compliance | Real |
| `npx tsx src/cli.ts compliance prove <addr>` | Generate ZK proof | Real |
| `npx tsx src/cli.ts compliance verify <file> --mock` | Verify ZK proof | Mock |
| `npx tsx src/cli.ts swap quote 100 USDC SOL` | Get swap quote | Mock |
| `npx tsx src/cli.ts swap execute 100 USDC SOL --mock` | Execute private swap | Mock |
| `npx tsx src/cli.ts lend deposit 100 USDC --mock` | Deposit to lending | Mock |
| `npx tsx src/cli.ts lend position` | View lending position | Mock |

---

## Mode Reference

| Flag | Description |
|------|-------------|
| `--devnet` | Execute real transactions on Solana devnet |
| `--mock` | Simulate locally (no wallet/SOL needed) |
| (no flag) | Default behavior varies by command |

**Real devnet** commands require:
- Funded wallet (SOL for fees)
- Valid RPC provider (Helius/Quicknode)
- NETWORK=devnet in .env

**Mock mode** commands work without:
- No wallet needed
- No SOL needed
- Instant execution

---

## Token Support

### SOL (Default)
```bash
# All commands use SOL by default
npx tsx src/cli.ts deposit 0.5
npx tsx src/cli.ts pay https://api.example.com --devnet
```

### USDC (Devnet)
```bash
# Get USDC from Circle faucet
open https://faucet.circle.com/
# Select: Solana -> Devnet -> Paste wallet address
# Receive: 20 USDC (limit: 20 per 2 hours)

# Deposit USDC
npx tsx src/cli.ts deposit 10 --token USDC
```

---

## Troubleshooting

### "Insufficient balance"
```bash
# CLI airdrop
solana airdrop 2 --url devnet

# Or web faucet (more reliable)
open https://faucet.solana.com/
```

### "RPC provider required"
```bash
# Ensure .env has one of:
HELIUS_API_KEY=your_key
# or
QUICKNODE_URL=https://...
# or
RPC_URL=https://...
```

### "WALLET_SECRET_KEY required"
```bash
# Export your wallet key
solana config get keypair
# Copy the file contents as JSON array to .env
```

### Rate limited on faucet
Use https://faucet.solana.com/ (web faucet) instead of CLI airdrop.
