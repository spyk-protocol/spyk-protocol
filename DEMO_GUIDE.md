# SPYK Protocol - Devnet Demo Guide

> Verified working commands on Solana devnet with real transaction proofs

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
pnpm dev faucet --token SOL --amount 2

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
pnpm dev faucet --token USDC
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
pnpm dev deposit 0.1

# With mock mode (no real transaction)
pnpm dev deposit 0.5 --mock
```

**Expected output (real devnet):**
```
Shielding 0.1 SOL...
Successfully shielded 0.1 SOL!
Transaction: https://solscan.io/tx/...?cluster=devnet
```

**Note:** MockPrivacyCash sends real devnet transactions with memo `SPYK-MOCK-PC:SHIELD:SOL:0.1`

### Withdraw (Unshield)

```bash
# Unshield 0.05 SOL from private pool
pnpm dev withdraw 0.05

# With destination address
pnpm dev withdraw 0.05 -d <recipient_address>
```

**Expected output:**
```
Unshielding 0.05 SOL...
Successfully unshielded 0.05 SOL!
Transaction: https://solscan.io/tx/...?cluster=devnet
```

### Check Balance

```bash
pnpm dev balance
```

---

## x402 Private AI Payments

Pay APIs privately using ephemeral keypairs. Your wallet is never linked on-chain.

### Real Devnet Payment

```bash
# Execute real devnet transaction
pnpm dev pay https://api.example.com/premium --devnet -a 0.001
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
Payment Tx:        3eMznBTeRiR7cMbisGgySuYRo5eSRMxygSn9hsbcbnQr1B1KLzLTi6UPcc1c5gNG89u6RsdgfkaSEegTbu7m7kVs

View on Solscan:   https://solscan.io/tx/3eMznBTeRiR7cMbisGgySuYRo5eSRMxygSn9hsbcbnQr1B1KLzLTi6UPcc1c5gNG89u6RsdgfkaSEegTbu7m7kVs?cluster=devnet
```

### Mock Mode (Demo without SOL)

```bash
pnpm dev pay https://api.claude.ai/v1/messages --mock
```

### With Custom Recipient

```bash
pnpm dev pay https://api.example.com --devnet -a 0.001 -r <recipient_address>
```

---

## Noir ZK Compliance Proofs

Generate and verify zero-knowledge proofs that an address is not sanctioned.

### Check Compliance

```bash
# Check if address is compliant (mock mode - no nargo required)
pnpm dev compliance check <solana_address> --mock
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
# Generate ZK proof (mock mode)
pnpm dev compliance prove <solana_address> --mock

# Save proof to file
pnpm dev compliance prove <solana_address> --mock -o proof.json
```

**Expected output:**
```
[Compliance] SPYK ZK Proof Generation

Generating ZK proof (mock mode)...

[SUCCESS] ZK Proof Generated

--- Proof Details ---
Address:     <your_address>
Circuit:     spyk_compliance
Noir Ver:    1.0.0
Proof Size:  388 bytes
Generated:   2026-02-01T12:00:00.000Z
Time:        45ms
Mode:        mock

--- Proof (Base64) ---
UHJvb2Y6IG1vY2tfcHJvb2ZfZm9yX2FkZHJlc3NfMTIzNDU2Nzg5MGFiY2RlZi4uLg==...
(520 chars total)

Tip: Use -o <file> to save full proof to a file
```

### Verify Proof

```bash
# Verify proof locally (mock mode)
pnpm dev compliance verify proof.json --mock

# Verbose output
pnpm dev compliance verify proof.json --mock -v
```

**Expected output:**
```
[Compliance] SPYK ZK Proof Verification

Loading proof...
Verifying proof locally (mock mode)...

[VERIFIED] Proof is structurally valid

--- Verification Result ---
Address:   <your_address>
Verified:  2026-02-01T12:00:00.000Z
Signature: mock_verification_...

[Note] This was a local mock verification.
Remove --mock flag for on-chain verification.
```

**Note:** Real ZK proofs require `nargo` and `sunspot` installed. Mock mode generates simulated proofs for demo purposes.

---

## Arcium Private DeFi

Encrypted swaps and lending with hidden amounts. MXE (Multi-party eXecution Environment) not yet deployed.

### Get Swap Quote

```bash
pnpm dev swap quote 100 USDC SOL
```

**Expected output:**
```
[Arcium] Private Swap Quote

Note: Arcium MXE is not yet deployed on devnet.
Showing simulated quote with mock pricing.

Fetching swap quote...

--- Swap Quote ---
Input:           100 USDC
Expected Output: 1.000000 SOL
Minimum Output:  0.995000 SOL (0.5% slippage)
Fee:             0.003000 SOL (0.30%)
Price Impact:    10.00 bps
Exchange Rate:   1 USDC = 0.010000 SOL

--- Privacy Features ---
- Order size: Encrypted (hidden from observers)
- MEV protection: Enabled (confidential execution)
- Execution: Via Arcium MXE (Multi-party eXecution)
```

### Execute Swap (Mock)

```bash
pnpm dev swap execute 100 USDC SOL --mock
```

**Expected output:**
```
[Arcium] Private Swap Execution

 MOCK MODE  Arcium MXE not available on devnet

--- How Private Swaps Work ---
1. Your order size is encrypted before submission
2. MXE nodes execute the swap with hidden amounts
3. No one can see your order size or front-run you
4. Result is returned encrypted to your wallet

Executing private swap...

[SUCCESS] Swap Complete!

--- Swap Result ---
Input:        100 USDC
Output:       0.997000 SOL
Computation:  ArciumMock...

--- Privacy Summary ---
Order size:    HIDDEN (encrypted on-chain)
Front-running: PROTECTED (MEV-resistant)
Execution:    Arcium MXE (confidential)

(Mock mode - simulated execution)
```

### Private Lending

```bash
# Deposit to lending pool
pnpm dev lend deposit 100 USDC --mock

# View position
pnpm dev lend position

# Withdraw
pnpm dev lend withdraw 50 USDC --mock
```

---

## Verified Devnet Transactions

Real transaction proofs from testing:

| Feature | Transaction | Solscan Link |
|---------|-------------|--------------|
| x402 Payment | Ephemeral keypair payment | [3eMznBTeRiR7cMbisGgySuYRo5eSRMxygSn9hsbcbnQr1B1KLzLTi6UPcc1c5gNG89u6RsdgfkaSEegTbu7m7kVs](https://solscan.io/tx/3eMznBTeRiR7cMbisGgySuYRo5eSRMxygSn9hsbcbnQr1B1KLzLTi6UPcc1c5gNG89u6RsdgfkaSEegTbu7m7kVs?cluster=devnet) |

---

## Command Summary

| Command | Description | Mode |
|---------|-------------|------|
| `pnpm dev faucet` | Get devnet SOL/USDC | Real |
| `pnpm dev deposit 0.1` | Shield SOL to private pool | Real |
| `pnpm dev withdraw 0.1` | Unshield from private pool | Real |
| `pnpm dev balance` | Check balances | Real |
| `pnpm dev pay <url> --devnet` | Private x402 payment | Real |
| `pnpm dev pay <url> --mock` | Simulated payment | Mock |
| `pnpm dev compliance check <addr> --mock` | Check compliance | Mock |
| `pnpm dev compliance prove <addr> --mock` | Generate ZK proof | Mock |
| `pnpm dev compliance verify <file> --mock` | Verify ZK proof | Mock |
| `pnpm dev swap quote 100 USDC SOL` | Get swap quote | Mock |
| `pnpm dev swap execute 100 USDC SOL --mock` | Execute private swap | Mock |
| `pnpm dev lend deposit 100 USDC --mock` | Deposit to lending | Mock |
| `pnpm dev lend position` | View lending position | Mock |

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

## Troubleshooting

### "Insufficient balance"
```bash
pnpm dev faucet --token SOL --amount 2
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
