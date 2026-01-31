# @spyk-protocol/demo

> Interactive CLI demonstration of the SPYK Protocol SDK

[![npm version](https://img.shields.io/npm/v/@spyk-protocol/demo.svg)](https://www.npmjs.com/package/@spyk-protocol/demo)

## Requirements

| Dependency | Version | Required |
|------------|---------|----------|
| **Node.js** | >= 24.0.0 | Yes |
| **pnpm** | >= 8.0.0 | Yes |
| **Solana CLI** | >= 1.18.0 | Optional |

### Install Node 24+

```bash
# Using nvm
nvm install 24
nvm use 24

# Verify
node --version  # Should show v24.x.x
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/spyk-protocol/spyk-demo
cd spyk-demo

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your Helius API key and wallet

# Run the demo
pnpm dev interactive
```

## Environment Setup

Create a `.env` file with:

```env
# Helius RPC API Key (required)
HELIUS_API_KEY=your_helius_api_key_here

# Wallet secret key as JSON array (required)
WALLET_SECRET_KEY=[1,2,3,...,64]

# Network: mainnet or devnet (default: devnet)
NETWORK=devnet
```

Get your Helius API key at [helius.xyz](https://helius.xyz).

## Commands

### Interactive Mode

The guided demo experience:

```bash
pnpm dev interactive
```

This walks you through:
1. Selecting an operation (pay/deposit/withdraw/transfer/balance)
2. For x402 pay: Enter API URL and amount
3. For others: Choose token, enter amounts
4. Confirming transactions
5. Viewing results with Solscan links

### Direct Commands

#### Pay (x402 Private AI Payment) ⭐

**The key feature** - pay for AI APIs privately using x402 protocol:

```bash
# Pay for an API privately (mock mode for demo)
pnpm dev pay https://api.claude.ai/v1/messages --mock

# Pay with specific amount
pnpm dev pay https://api.example.com/data --amount 0.01 --mock
```

This demonstrates:
1. The surveillance problem with normal payments
2. Shielding funds into ZK pool
3. Generating ephemeral keypair
4. Paying from ephemeral (no link to your wallet)
5. Privacy summary showing zero on-chain linkage

**Output:**
```
🤖 SPYK x402 - Private AI Payment

━━━ The Problem ━━━
Normal payment: Your wallet → API Provider
  ⚠ Your wallet is permanently linked on-chain
  ⚠ Competitors can see which APIs you use

━━━ SPYK Solution ━━━
1. Shield funds into ZK pool (Privacy Cash)
2. Generate ephemeral keypair (one-time use)
3. Pay API from ephemeral (no link to you!)

✅ Private Payment Complete!

━━━ Privacy Summary ━━━
Your wallet:     (hidden)
Ephemeral used:  7xK2abc...
On-chain link:   NONE ✓
```

#### Deposit (Shield)

Shield SOL or USDC into the private pool:

```bash
# Shield 1 SOL
pnpm dev deposit 1

# Shield 50 USDC
pnpm dev deposit 50 --token USDC
```

#### Withdraw (Unshield)

Unshield SOL or USDC from the private pool:

```bash
# Unshield 0.5 SOL
pnpm dev withdraw 0.5

# Unshield to specific address
pnpm dev withdraw 0.5 --destination <address>
```

#### Transfer

Private transfer using ShadowWire (supports all tokens):

```bash
# Transfer 1 SOL
pnpm dev transfer <recipient> 1

# Transfer 1000 BONK
pnpm dev transfer <recipient> 1000 --token BONK

# Transfer 100 RADR
pnpm dev transfer <recipient> 100 --token RADR
```

#### Balance

Check private balances:

```bash
# All balances
pnpm dev balance

# Specific token
pnpm dev balance --token SOL
```

## Supported Tokens

| Token | Deposit/Withdraw | Transfer |
|-------|-----------------|----------|
| SOL | Yes | Yes |
| USDC | Yes | Yes |
| BONK | No | Yes |
| RADR | No | Yes |
| ORE | No | Yes |

## Protocol Routing

- **SOL/USDC**: Uses Privacy Cash for deposit/withdraw operations
- **All tokens**: Uses ShadowWire for private transfers

The CLI automatically enforces these rules with helpful error messages.

## Example Sessions

### x402 Private AI Payment (Recommended Demo)

```
🔐 SPYK Protocol Interactive Demo

? What would you like to do? 💳 Pay API (x402 Private AI Payment)
? API URL to pay: https://api.claude.ai/v1/messages
? Payment amount (SOL): 0.001

🤖 SPYK x402 - Private AI Payment

━━━ The Problem ━━━
Normal payment: Your wallet → API Provider
  ⚠ Competitors can see which APIs you use

━━━ SPYK Solution ━━━
1. Shield funds into ZK pool
2. Generate ephemeral keypair
3. Pay from ephemeral (no link!)

✅ Private Payment Complete!
Your wallet: (hidden)
On-chain link: NONE ✓
```

### Private Transfer

```
🔐 SPYK Protocol Interactive Demo

? What would you like to do? 📤 Transfer (Private transfer any token)
? Select token: BONK
? Amount of BONK: 1000
? Recipient address: 7vfC...xyz
? Confirm: Transfer 1000 BONK to 7vfC...? Yes

✓ Transferred 1000 BONK!
Transaction: https://solscan.io/tx/...?cluster=devnet
```

## Development

```bash
# Build
pnpm build

# Run from dist
pnpm start --help
```

## Network Support

### Mainnet (Full Features)

For full privacy with ZK shielding, use mainnet:

```bash
# In .env
NETWORK=mainnet
```

All features work on mainnet:
- ✅ `deposit` - ZK shielding via Privacy Cash
- ✅ `withdraw` - ZK unshielding via Privacy Cash
- ✅ `transfer` - Private transfers via ShadowWire
- ✅ `pay` - Full x402 private payments (shielded → ephemeral → recipient)

### Devnet (Limited)

Privacy Cash **does not support devnet** (no relayer service). See [Privacy Cash FAQ](https://privacycash.mintlify.app/sdk).

On devnet, use these modes:

```bash
# x402 with devnet mode (uses ephemeral without ZK shielding)
pnpm dev pay https://api.example.com --devnet -r <recipient_address>

# ShadowWire transfers work on devnet
pnpm dev transfer <recipient> 100 --token BONK
```

| Feature | Mainnet | Devnet |
|---------|---------|--------|
| `deposit` | ✅ | ❌ (no relayer) |
| `withdraw` | ✅ | ❌ (no relayer) |
| `transfer` | ✅ | ✅ |
| `pay --mock` | ✅ | ✅ |
| `pay --devnet` | N/A | ✅ (ephemeral only) |
| `pay` (full) | ✅ | ❌ (needs shielding) |

## SDK Integration

This demo uses the [@spyk-protocol/sdk](https://www.npmjs.com/package/@spyk-protocol/sdk) package.

For integration in your own apps, see the [SDK documentation](../spyk-sdk/README.md).

## License

MIT
