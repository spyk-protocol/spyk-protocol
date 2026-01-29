# @spyk-protocol/sdk

> Unified privacy SDK for Solana - integrate Privacy Cash and ShadowWire with 3 lines of code

[![npm version](https://img.shields.io/npm/v/@spyk-protocol/sdk.svg)](https://www.npmjs.com/package/@spyk-protocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI-Native](https://img.shields.io/badge/AI--Native-Claude%20Ready-blueviolet)](./SKILL.md)

## Requirements

| Dependency | Version | Notes |
|------------|---------|-------|
| **Node.js** | >= 24.0.0 | Required for Privacy Cash WASM bindings |
| **pnpm** | >= 8.0.0 | Recommended package manager |
| **Solana CLI** | >= 1.18.0 | Optional, for wallet management |

### Version Check

```bash
node --version    # Must be v24.0.0 or higher
pnpm --version    # Must be v8.0.0 or higher
solana --version  # Optional
```

### Install Node 24+

```bash
# Using nvm (recommended)
nvm install 24
nvm use 24

# Or using fnm
fnm install 24
fnm use 24
```

## Quick Start

```typescript
import { Spyk } from '@spyk-protocol/sdk';

const spyk = new Spyk({ heliusApiKey: process.env.HELIUS_API_KEY!, network: 'mainnet', wallet });
await spyk.transfer({ to: recipientAddress, amount: 1, token: 'SOL' }); // Private transfer!
```

**That's it.** Three lines to add privacy to your Solana app.

## AI-Native

SPYK is the first privacy SDK designed for AI agents. Claude Code, ChatGPT, and other AI assistants can generate correct SPYK integration code.

**Example prompt:**
> "Add privacy transfers to my Solana payment app using SPYK"

See [SKILL.md](./SKILL.md) for AI agent documentation.

## Installation

```bash
# pnpm (recommended)
pnpm add @spyk-protocol/sdk

# npm
npm install @spyk-protocol/sdk

# yarn
yarn add @spyk-protocol/sdk
```

## Configuration

### Environment Setup

Create a `.env` file:

```env
# RPC Provider (choose one)
HELIUS_API_KEY=your_helius_api_key_here
# OR
QUICKNODE_URL=https://your-endpoint.quiknode.pro/xxx

# Optional: Compliance (Range Protocol)
RANGE_API_KEY=your_range_api_key
ENABLE_COMPLIANCE=true
```

Get your API keys:
- Helius: [helius.xyz](https://helius.xyz)
- Quicknode: [quicknode.com](https://quicknode.com)
- Range: Contact info@range.org

### SDK Configuration

```typescript
import { Keypair } from '@solana/web3.js';
import { Spyk } from '@spyk-protocol/sdk';

const spyk = new Spyk({
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: 'mainnet', // or 'devnet'
  wallet: Keypair.fromSecretKey(yourSecretKey),
});
```

## Usage Examples

### Unified Interface (Recommended)

The `Spyk` class automatically routes to the right protocol based on token type.

```typescript
// Shield SOL into private pool
await spyk.deposit('SOL', 1.5);

// Private transfer (auto-routes to ShadowWire for BONK)
await spyk.transfer({
  to: recipientAddress,
  amount: 100000,
  token: 'BONK',
});

// Unshield USDC from private pool
await spyk.withdraw('USDC', 50);

// Get all balances
const balances = await spyk.getBalance();
```

### Privacy Cash Direct Access

For SOL and USDC shielding operations:

```typescript
const { privacyCash } = spyk;

// Shield SOL
const shieldResult = await privacyCash.deposit(1.0, {
  onSigning: () => console.log('Signing...'),
  onSent: (sig) => console.log('Sent:', sig),
  onConfirmed: (sig) => console.log('Confirmed:', sig),
});

// Unshield to another address
await privacyCash.withdraw(0.5, recipientAddress);

// Check private balance
const balance = await privacyCash.getPrivateBalance('SOL');
```

### ShadowWire Direct Access

For multi-token private transfers:

```typescript
const { shadowWire } = spyk;

// Private transfer with auto-detection
await shadowWire.transfer({
  to: recipientAddress,
  amount: 1000,
  token: 'RADR',
});

// Explicit transfer type
await shadowWire.transfer({
  to: recipientAddress,
  amount: 500,
  token: 'ORE',
  type: 'internal', // fully private
});

// Check if address has ShadowWire account
const hasAccount = await shadowWire.hasShadowWireAccount(address);
```

### Balance Queries

```typescript
// Specific token balance
const solBalance = await spyk.getBalance('SOL');

// All balances aggregated
const allBalances = await spyk.getBalance();
console.log('Privacy Cash SOL:', allBalances.privacyCash.SOL);
console.log('Privacy Cash USDC:', allBalances.privacyCash.USDC);
```

## API Reference

### Spyk Class

| Method | Description |
|--------|-------------|
| `transfer(params, callbacks?)` | Private transfer, auto-routes based on token |
| `deposit(token, amount, callbacks?)` | Shield tokens into private pool (SOL/USDC) |
| `withdraw(token, amount, dest?, callbacks?)` | Unshield tokens from private pool (SOL/USDC) |
| `getBalance(token?)` | Query balance for token or aggregate all |
| `supportsDeposit(token)` | Check if token supports deposit/withdraw |
| `getProtocolForToken(token)` | Get protocol name for token routing |

### SpykPrivacyCash Class

| Method | Description |
|--------|-------------|
| `deposit(amount, callbacks?)` | Shield SOL |
| `depositUSDC(amount, callbacks?)` | Shield USDC |
| `withdraw(amount, destination, callbacks?)` | Unshield SOL |
| `withdrawUSDC(amount, destination, callbacks?)` | Unshield USDC |
| `getPrivateBalance(token)` | Query shielded balance |

### SpykShadowWire Class

| Method | Description |
|--------|-------------|
| `transfer(params, callbacks?)` | Private transfer |
| `hasShadowWireAccount(address)` | Check for ShadowWire account |
| `getBalance(token)` | Query balance |
| `getSupportedTokens()` | List supported tokens |
| `isTokenSupported(token)` | Check token support |

## x402 Integration (SPYK-402)

SPYK enables **privacy-preserving x402 payments** - pay for AI APIs without revealing your identity.

### What is x402?

x402 is HTTP status code 402 Payment Required. It enables pay-per-use APIs where:
- API returns 402 with payment invoice
- You pay the invoice
- API returns data with proof of payment

SPYK makes x402 payments **private** using shielded funds and ephemeral keypairs.

### Privacy Mechanism

Traditional x402 payment: `Your Wallet → API Provider` (linkable on-chain)

SPYK x402 payment:
1. Your wallet → Shield SOL into private pool (zero-knowledge proof)
2. Private pool → Ephemeral keypair (one-time address)
3. Ephemeral keypair → Pay API (no link to your identity)
4. Ephemeral discarded → Payment unlinkable

**Result:** The API provider sees a payment from an ephemeral address with no link to your real wallet.

### Usage Example

```typescript
import { Spyk } from '@spyk-protocol/sdk';

const spyk = new Spyk({
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: 'mainnet',
  wallet: yourKeypair,
});

// 1. Shield funds for private payments
await spyk.deposit('SOL', 0.1);

// 2. Make x402 API request
const response = await fetch('https://api.example.com/premium-data');

if (response.status === 402) {
  const body = await response.json();
  const invoice = body.x402;

  // 3. Pay privately using shielded funds
  const result = await spyk.x402.payPrivately(invoice);

  // 4. Retry request with proof
  const dataResponse = await fetch('https://api.example.com/premium-data', {
    headers: { 'x-payment-proof': result.proof }
  });

  const data = await dataResponse.json();
  console.log('Got data privately:', data);
}
```

### SpykX402Client API

```typescript
const { x402 } = spyk;

// Check shielded balance
const balance = await x402.getShieldedBalance();

// Pay invoice privately
const result = await x402.payPrivately({
  amount: '0.001',
  token: 'SOL',
  recipient: 'recipient_address',
  memo: 'Payment for API access',
  facilitator: 'facilitator_url',
  network: 'mainnet',
});

// Verify payment
const verification = await x402.verifyPayment(result.proof);
```

### Mock Mode for Testing

```typescript
// Use mock facilitator for testing without real payments
const spyk = new Spyk({
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: 'devnet',
  wallet: yourKeypair,
  x402Config: {
    useMockFacilitator: true,
    logPayments: true, // See payment flow
  }
});
```

### MCP Integration

Use SPYK with Claude Code for AI-powered private payments:

```bash
# Install MCP server
cd spyk-sdk/mcp
npm install && npm run build

# Configure in ~/.claude/settings.json
{
  "mcpServers": {
    "spyk": {
      "command": "node",
      "args": ["/path/to/spyk-sdk/mcp/dist/index.js"],
      "env": {
        "SPYK_NETWORK": "devnet",
        "SPYK_KEYPAIR_PATH": "~/.config/solana/id.json",
        "SPYK_USE_MOCK_FACILITATOR": "true"
      }
    }
  }
}
```

Then in Claude Code:
```
Shield 0.1 SOL for private payments
Pay for https://api.example.com/data privately
What's my SPYK balance?
```

See [MCP README](./mcp/README.md) for full setup instructions.

## Supported Tokens

| Token | Privacy Cash | ShadowWire | Fee |
|-------|-------------|------------|-----|
| SOL | Yes (deposit/withdraw) | Yes (transfer) | 0.5% |
| USDC | Yes (deposit/withdraw) | Yes (transfer) | 1% |
| BONK | No | Yes (transfer) | 1% |
| RADR | No | Yes (transfer) | 0.3% |
| ORE | No | Yes (transfer) | 0.3% |
| JIM | No | Yes (transfer) | 1% |
| GODL | No | Yes (transfer) | 1% |
| HUSTLE | No | Yes (transfer) | 0.3% |
| + 14 more | No | Yes (transfer) | varies |

See [ShadowWire docs](https://github.com/radrdotfun/ShadowWire) for full token list.

## Error Handling

```typescript
import {
  SpykError,
  HeliusConnectionError,
  TransactionError,
  InsufficientBalanceError,
  UnsupportedTokenError,
} from '@spyk-protocol/sdk';

try {
  await spyk.deposit('BONK', 100);
} catch (error) {
  if (error instanceof UnsupportedTokenError) {
    console.log('Token not supported for deposit:', error.token);
  } else if (error instanceof InsufficientBalanceError) {
    console.log('Need:', error.required, 'Have:', error.available);
  } else if (error instanceof HeliusConnectionError) {
    console.log('RPC connection failed');
  } else if (error instanceof TransactionError) {
    console.log('Transaction failed:', error.signature);
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `HELIUS_CONNECTION_FAILED` | RPC connection error |
| `INVALID_API_KEY` | Invalid Helius API key |
| `TRANSACTION_FAILED` | Transaction execution failed |
| `INSUFFICIENT_BALANCE` | Not enough public balance |
| `INSUFFICIENT_PRIVATE_BALANCE` | Not enough shielded balance |
| `UNSUPPORTED_TOKEN` | Token not supported by protocol |
| `INVALID_ADDRESS` | Invalid Solana address |
| `INVALID_AMOUNT` | Amount must be positive |

## Sponsor Integrations

SPYK integrates multiple privacy and infrastructure sponsors:

### Arcium - Encrypted DeFi

```typescript
import { SpykArcium } from '@spyk-protocol/sdk';

const arcium = new SpykArcium({
  connection,
  wallet,
  cluster: 'devnet',
});

// Private swap with hidden amounts
await arcium.swap.executePrivate({
  tokenIn: 'USDC',
  tokenOut: 'SOL',
  amountIn: 100,  // Encrypted on-chain
});

// Confidential lending
await arcium.lending.depositPrivate({
  token: 'USDC',
  amount: 1000,  // Hidden from observers
});
```

### Noir/Sunspot - ZK Proofs

```typescript
import { noir } from '@spyk-protocol/sdk';

// Create prover for OFAC compliance
const prover = noir.createNoirProver();

// Generate non-membership proof
const result = await prover.proveCompliance(address);

if (result.passed) {
  // Verify on-chain
  const verifier = noir.createNoirVerifier(connection, wallet, {
    verifierProgramId: VERIFIER_PROGRAM_ID,
  });
  await verifier.verifyOnChain(result.noirProof);
}
```

### Range - Compliance Pre-Screening

```typescript
import { RangeCompliance } from '@spyk-protocol/sdk';

const compliance = new RangeCompliance({
  apiKey: process.env.RANGE_API_KEY,
});

// Pre-screen before payment
const check = await compliance.preScreen(recipientAddress);

if (check.passed) {
  await spyk.transfer({ to: recipientAddress, amount: 1, token: 'SOL' });
} else {
  console.log('Address flagged:', check.reason);
}
```

### Multi-Provider RPC (Helius + Quicknode)

```typescript
import { Spyk } from '@spyk-protocol/sdk';

// Use Helius
const spykHelius = new Spyk({
  heliusApiKey: process.env.HELIUS_API_KEY,
  network: 'mainnet',
  wallet,
});

// Or use Quicknode
const spykQuicknode = new Spyk({
  rpcProvider: 'quicknode',
  quicknodeUrl: process.env.QUICKNODE_URL,
  network: 'mainnet',
  wallet,
});
```

## For AI Agents

AI assistants should read [SKILL.md](./SKILL.md) for:
- Complete API reference
- Common integration patterns
- Error handling best practices
- Token routing logic

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with Helius RPC for maximum reliability on Solana.
