# SPYK Protocol

Privacy-first infrastructure for Solana. Shield funds, transfer privately, and pay for AI APIs without revealing your identity.

## Overview

SPYK Protocol provides privacy-preserving financial infrastructure on Solana through:

- **Privacy Cash** - Shield SOL and USDC using zero-knowledge proofs
- **ShadowWire** - Private transfers for 20+ Solana tokens
- **SPYK-402** - Privacy-preserving payments for AI APIs (x402)

### Why SPYK?

**Problem:** Solana transactions are fully public. Every payment, transfer, and interaction is permanently linked to your wallet address.

**Solution:** SPYK breaks the on-chain link between your identity and your transactions using:
- Zero-knowledge proofs (Privacy Cash)
- Confidential transfers (ShadowWire)
- Ephemeral keypairs (SPYK-402)

## Quick Start

### Installation

```bash
npm install @spyk-protocol/sdk
```

### Basic Usage

```typescript
import { Spyk } from '@spyk-protocol/sdk';

const spyk = new Spyk({
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: 'mainnet',
  wallet: yourKeypair,
});

// Shield SOL for private use
await spyk.deposit('SOL', 1.0);

// Private transfer
await spyk.transfer({
  to: recipientAddress,
  amount: 0.5,
  token: 'SOL',
});

// Pay for AI API privately (SPYK-402)
const result = await spyk.x402.payPrivately(invoice);
```

See the [SDK documentation](./spyk-sdk/README.md) for complete API reference.

## SPYK-402: Private AI Payments

SPYK-402 enables privacy-preserving payments for x402 APIs (HTTP 402 Payment Required).

### How It Works

1. **Shield Funds**: Move SOL into a private pool using zero-knowledge proofs
2. **Generate Ephemeral**: Create a one-time keypair for the payment
3. **Withdraw Privately**: Transfer exact payment amount to ephemeral address
4. **Pay Anonymously**: Use ephemeral keypair to sign the x402 payment
5. **Discard Keypair**: Ephemeral address is never reused

**Privacy Property**: The API provider sees a payment from an ephemeral address with no link to your real wallet.

### Use Cases

- **AI API Payments**: Pay for Claude, GPT, or other AI APIs without revealing your wallet
- **Data Feeds**: Access premium data feeds privately
- **Metered Services**: Pay-per-use services with full privacy
- **Agent Payments**: AI agents making autonomous payments without leaking identity

### Example Flow

```typescript
// 1. Shield funds for private payments
await spyk.deposit('SOL', 0.1);

// 2. API returns 402 with invoice
const response = await fetch('https://api.example.com/data');
const invoice = (await response.json()).x402;

// 3. Pay privately
const result = await spyk.x402.payPrivately(invoice);

// 4. Get data with proof
const dataResponse = await fetch('https://api.example.com/data', {
  headers: { 'x-payment-proof': result.proof }
});
```

### Claude Code Integration

SPYK provides an MCP server for Claude Code integration:

```bash
# Install MCP server
cd spyk-sdk/mcp
npm install && npm run build
```

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "spyk": {
      "command": "node",
      "args": ["/absolute/path/to/spyk-sdk/mcp/dist/index.js"],
      "env": {
        "SPYK_NETWORK": "devnet",
        "SPYK_KEYPAIR_PATH": "~/.config/solana/id.json"
      }
    }
  }
}
```

Then ask Claude:
```
Shield 0.1 SOL for private payments
Pay for https://api.example.com/data privately
What's my SPYK balance?
```

See [MCP documentation](./spyk-sdk/mcp/README.md) for details.

## Sponsor Integrations

SPYK integrates best-in-class privacy and infrastructure sponsors:

### Privacy Cash

Zero-knowledge shielding for SOL and USDC on Solana.

**Integration:**
```typescript
import { SpykPrivacyCash } from '@spyk-protocol/sdk';

const privacyCash = new SpykPrivacyCash(connection, wallet);

// Shield SOL
await privacyCash.deposit(1.0);

// Unshield to any address
await privacyCash.withdraw(0.5, recipientAddress);

// Check private balance
const balance = await privacyCash.getPrivateBalance('SOL');
```

**Key Features:**
- Zero-knowledge proofs for complete privacy
- SOL and USDC support
- 0.5% fee for SOL, 1% for USDC
- Unshield to any address

**Website:** [privacycash.net](https://privacycash.net)

### ShadowWire

Confidential transfers for 20+ Solana tokens using confidential transfer extensions.

**Integration:**
```typescript
import { SpykShadowWire } from '@spyk-protocol/sdk';

const shadowWire = new SpykShadowWire(connection, wallet);

// Private transfer (auto-detects internal vs cross-border)
await shadowWire.transfer({
  to: recipientAddress,
  amount: 1000,
  token: 'BONK',
});

// Check supported tokens
const tokens = await shadowWire.getSupportedTokens();
```

**Key Features:**
- 20+ tokens supported (BONK, RADR, ORE, JIM, GODL, etc.)
- Automatic routing (internal vs cross-border)
- Fees: 0.3-1% depending on token
- Built on Solana confidential transfers

**GitHub:** [github.com/radrdotfun/ShadowWire](https://github.com/radrdotfun/ShadowWire)

### Helius

Enterprise-grade Solana RPC with 99.9% uptime and global edge network.

**Integration:**
```typescript
import { createHeliusConnection } from '@spyk-protocol/sdk';

const connection = createHeliusConnection({
  apiKey: process.env.HELIUS_API_KEY!,
  network: 'mainnet', // or 'devnet'
});

// Use for all Solana transactions
const balance = await connection.getBalance(publicKey);
```

**Key Features:**
- Sub-100ms latency globally
- Built-in retry and failover
- Priority fee management
- WebSocket support

**Website:** [helius.xyz](https://helius.xyz)

### x402 Protocol

HTTP 402 Payment Required standard for pay-per-use APIs.

**Integration:**
```typescript
import { SpykX402Client } from '@spyk-protocol/sdk';

const x402Client = new SpykX402Client(
  privacyCash,
  shadowWire,
  connection
);

// Pay invoice privately
const result = await x402Client.payPrivately({
  amount: '0.001',
  token: 'SOL',
  recipient: 'recipient_address',
  memo: 'Payment for API access',
  facilitator: 'facilitator_url',
  network: 'mainnet',
});
```

**Key Features:**
- Privacy-preserving payments using shielded funds
- Ephemeral keypairs for anonymity
- Standard HTTP 402 flow
- Proof-based authorization

**Specification:** [RFC 9110 Section 15.5.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.3)

## Project Structure

```
spyk-protocol/
├── spyk-sdk/           # Main SDK package
│   ├── src/
│   │   ├── Spyk.ts                    # Unified interface
│   │   ├── privacy-cash/              # Privacy Cash integration
│   │   ├── shadowwire/                # ShadowWire integration
│   │   ├── x402/                      # x402 payment client
│   │   └── helius/                    # Helius RPC integration
│   ├── mcp/                           # Claude Code MCP server
│   └── README.md
├── spyk-web/           # Browser demo application
├── spyk-demo/          # CLI demo examples
└── README.md           # This file
```

## Requirements

| Dependency | Version | Notes |
|------------|---------|-------|
| Node.js | >= 24.0.0 | Required for Privacy Cash WASM bindings |
| pnpm | >= 8.0.0 | Recommended package manager |
| Solana CLI | >= 1.18.0 | Optional, for wallet management |

### Install Node 24+

```bash
# Using nvm (recommended)
nvm install 24
nvm use 24

# Or using fnm
fnm install 24
fnm use 24
```

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Build SDK
cd spyk-sdk
pnpm build

# Build MCP server
cd spyk-sdk/mcp
pnpm build
```

## Environment Configuration

Create a `.env` file in the SDK directory:

```bash
# Helius RPC (required)
HELIUS_API_KEY=your_helius_api_key

# Wallet (for development)
SPYK_PRIVATE_KEY=your_base58_private_key
# OR
SPYK_KEYPAIR_PATH=~/.config/solana/id.json

# Network
SPYK_NETWORK=devnet  # or mainnet

# x402 Testing
SPYK_USE_MOCK_FACILITATOR=true  # Enable mock payments
```

## Demo Applications

### Browser Demo

Interactive web app demonstrating SPYK features:

```bash
cd spyk-web
pnpm install
pnpm dev
```

Open `http://localhost:3000`

### CLI Demo

Command-line examples:

```bash
cd spyk-demo
pnpm install

# Shield SOL
pnpm demo:shield

# Private transfer
pnpm demo:transfer

# x402 payment
pnpm demo:x402
```

## Security Considerations

### Privacy Guarantees

- **Privacy Cash**: Zero-knowledge proofs provide cryptographic privacy. Deposits and withdrawals cannot be linked.
- **ShadowWire**: Confidential transfers hide amounts using cryptographic commitments. Sender and receiver are visible but amounts are hidden.
- **SPYK-402**: Ephemeral keypairs break the on-chain link between your identity and payments.

### Trust Assumptions

- **Privacy Cash**: Trust the zkSNARK setup and smart contract security
- **ShadowWire**: Trust the Solana confidential transfer implementation
- **Helius**: Trust the RPC provider for transaction submission
- **x402 Facilitators**: Trust the facilitator for payment coordination

### Operational Security

- Never commit `.env` files or private keys
- Use devnet for development and testing
- Review transactions before approval
- Keep keypair files secure with appropriate permissions
- Use hardware wallets for production deployments

## Troubleshooting

### "Node version not supported"

Privacy Cash requires Node.js 24+. Install using nvm or fnm:

```bash
nvm install 24 && nvm use 24
```

### "No wallet configured"

Set either `SPYK_PRIVATE_KEY` or `SPYK_KEYPAIR_PATH` in your environment.

### "Failed to connect to RPC"

Check your `HELIUS_API_KEY` is valid. Get one at [helius.xyz](https://helius.xyz).

### "Insufficient shielded balance"

Shield funds first using `spyk.deposit()` before making private transfers or x402 payments.

### MCP server not working

1. Verify absolute path in config
2. Check server builds without errors: `npm run build`
3. Restart Claude Code after config changes

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- **SDK Documentation**: [spyk-sdk/README.md](./spyk-sdk/README.md)
- **MCP Server**: [spyk-sdk/mcp/README.md](./spyk-sdk/mcp/README.md)
- **Privacy Cash**: [privacycash.net](https://privacycash.net)
- **ShadowWire**: [github.com/radrdotfun/ShadowWire](https://github.com/radrdotfun/ShadowWire)
- **Helius**: [helius.xyz](https://helius.xyz)
- **x402 Protocol**: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.3)
