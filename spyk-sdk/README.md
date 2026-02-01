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

### Noir/Sunspot - ZK Compliance Proofs

Aztec Noir ZK proofs for privacy-preserving OFAC compliance verification.

```typescript
import { noir } from '@spyk-protocol/sdk';

// Check toolchain status
const status = await noir.checkToolchain();
console.log('CLI mode available:', status.ready);

// Create prover (auto-detects CLI vs mock mode)
const prover = noir.createNoirProver();
await prover.initialize();

// Generate compliance proof
const result = await prover.proveCompliance(walletAddress);
if (result.passed && result.noirProof) {
  console.log('Mode:', prover.getMode()); // 'cli' or 'mock'
  // Proof ready for on-chain verification
}
```

See [Noir ZK Compliance Flow](#noir-zk-compliance-flow) for complete documentation.

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

## Known Limitations

### Privacy Cash: Mainnet Only

Privacy Cash (the underlying ZK shielding protocol) **does not support devnet**. Per their [SDK FAQ](https://privacycash.mintlify.app/sdk):

> **Is there any devnet support?**
> Not for now. Please test on mainnet. It should be really straightforward to integrate.

This affects the following SPYK features on devnet:
- `spyk.deposit()` - Will fail (requires Privacy Cash relayer)
- `spyk.withdraw()` - Will fail (requires Privacy Cash relayer)
- `spyk.x402.payPrivately()` with full shielding - Will fail

**Workarounds for devnet testing:**

1. **x402 with `--devnet` mode**: Uses ephemeral keypairs without Privacy Cash shielding. Still breaks on-chain linkage but funds come from your wallet directly (not ZK shielded).

2. **ShadowWire transfers**: Work on devnet for multi-token private transfers.

3. **Test on mainnet**: Privacy Cash recommends testing on mainnet with small amounts.

### Relayer Dependency

Privacy Cash uses a centralized relayer service (`api3.privacycash.org`) that:
- Pays network fees for withdrawals
- Maintains the merkle tree state
- Is not open source

This means Privacy Cash features require the relayer to be operational.

## Noir ZK Compliance Flow

SPYK uses Aztec Noir zero-knowledge proofs to verify OFAC compliance without revealing user identities. This enables privacy-preserving sanctions screening before any privacy transaction.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SPYK NOIR ZK COMPLIANCE FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │    User      │    │   Noir/      │    │   Solana     │    │  Privacy  │ │
│  │   Wallet     │───▶│   Sunspot    │───▶│   Verifier   │───▶│   Tx OK   │ │
│  │              │    │   Prover     │    │   Program    │    │           │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│         │                   │                   │                   │       │
│         │                   │                   │                   │       │
│    1. Address          2. Generate         3. Verify          4. Proceed   │
│       bytes            ZK Proof           On-Chain          with Privacy   │
│                        (388 bytes)       (< 200k CU)          Transfer     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Pipeline

```
Off-Chain (User's Machine)
├── nargo compile      → target/circuit.json (ACIR bytecode)
├── nargo execute      → target/circuit.gz (witness)
└── sunspot prove      → target/circuit.proof (388 bytes)
                         target/circuit.pw (76 bytes public witness)

On-Chain (Solana Devnet/Mainnet)
├── Concatenate: proof || public_witness = instruction_data (464 bytes)
├── Send to verifier program: 548u4SFWZMaRWZQqdyAgm66z7VRYtNHHF2sr7JTBXbwN
└── Groth16 verification (< 200,000 compute units)
```

### SDK Usage

```typescript
import { noir } from '@spyk-protocol/sdk';

// 1. Check toolchain availability
const status = await noir.checkToolchain();
console.log('nargo:', status.nargo.installed ? status.nargo.version : 'not installed');
console.log('sunspot:', status.sunspot.installed ? 'installed' : 'not installed');
console.log('Ready for CLI mode:', status.ready);

// 2. Create prover (auto-detects CLI vs mock mode)
const prover = noir.createNoirProver();
await prover.initialize();

// 3. Generate compliance proof
const result = await prover.proveCompliance(walletAddress);
if (result.passed && result.noirProof) {
  console.log('Mode:', prover.getMode()); // 'cli' or 'mock'
  console.log('Proof size:', result.noirProof.proof.length, 'bytes');

  // 4. Verify on-chain (optional - for trustless verification)
  const verifier = noir.createNoirVerifier(connection, wallet, {
    verifierProgramId: noir.getDefaultVerifierProgramId('devnet'),
  });
  const verification = await verifier.verifyOnChain(result.noirProof);
  console.log('On-chain verified:', verification.verified);
  console.log('Transaction:', verification.signature);
}
```

### Prover Modes

The prover supports two modes, automatically detected based on toolchain availability:

| Mode | Description | Requirements | Use Case |
|------|-------------|--------------|----------|
| **CLI** | Real Groth16 proofs via nargo/sunspot | nargo 1.0.0-beta.18, sunspot | Production |
| **Mock** | Structurally valid mock proofs | None | Development, demos |

```typescript
// Force specific mode
const cliProver = noir.createNoirProver({ useCLI: true });   // Throws if tools missing
const mockProver = noir.createNoirProver({ useCLI: false }); // Always uses mock

// Auto-detect (default)
const prover = noir.createNoirProver(); // CLI if available, else mock
```

### Installation Requirements

#### nargo (Noir Compiler)

```bash
# Install noirup (Noir version manager)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash

# Install specific version
noirup -v 1.0.0-beta.18

# Verify installation
nargo --version
# Expected: nargo version = 1.0.0-beta.18
```

#### sunspot (Solana ZK Prover)

```bash
# Clone and build from source
git clone https://github.com/reilabs/sunspot.git
cd sunspot/go
go build -o sunspot

# Add to PATH or specify path in SDK config
export PATH="$PATH:$HOME/sunspot/go"
```

### Deployed Verifier Programs

| Network | Program ID | Circuit | Status |
|---------|------------|---------|--------|
| Devnet | `548u4SFWZMaRWZQqdyAgm66z7VRYtNHHF2sr7JTBXbwN` | smt_exclusion | Deployed |
| Mainnet | TBD | smt_exclusion | Roadmap |

### Circuit Details

The `smt_exclusion` circuit proves that an address is NOT in a Sparse Merkle Tree (SMT) containing OFAC-sanctioned addresses:

```
Circuit: smt_exclusion
├── Public Inputs
│   ├── smt_root (32 bytes) - Current OFAC tree root
│   └── pubkey_hash (32 bytes) - Hash of user's public key
├── Private Inputs
│   ├── pubkey (32 bytes) - User's Solana public key
│   ├── siblings (256 x 32 bytes) - Merkle proof path
│   └── leaf_value - Empty leaf proof
└── Output
    └── Groth16 proof (388 bytes)
```

### Integration with SPYK Protocol

Noir ZK proofs are required for the following SPYK operations:

| Feature | Requirement | Description |
|---------|-------------|-------------|
| **Privacy Cash Shield** | Required | Prove compliance before depositing SOL/USDC |
| **Privacy Cash Unshield** | Required | Prove compliance before withdrawing |
| **ShadowWire Transfer** | Required | Prove compliance before private transfer |
| **x402 Private Payment** | Required | Prove compliance before private API payment |
| **Arcium Encrypted DeFi** | Optional | Additional compliance layer for DeFi ops |

### Example: Full Compliance Flow

```typescript
import { Spyk, noir } from '@spyk-protocol/sdk';

async function privateTransferWithCompliance() {
  // 1. Initialize SPYK
  const spyk = new Spyk({
    heliusApiKey: process.env.HELIUS_API_KEY!,
    network: 'devnet',
    wallet: myKeypair,
  });

  // 2. Generate compliance proof
  const prover = noir.createNoirProver();
  await prover.initialize();

  const compliance = await prover.proveCompliance(myKeypair.publicKey);

  if (!compliance.passed) {
    throw new Error('Compliance check failed');
  }

  console.log(`Compliance proof generated (${prover.getMode()} mode)`);

  // 3. Optionally verify on-chain for trustless proof
  if (prover.isUsingCLI()) {
    const verifier = await noir.createAutoVerifier(connection, myKeypair, {
      network: 'devnet',
    });
    const verification = await verifier.verifyOnChain(compliance.noirProof!);
    console.log('On-chain verification:', verification.verified);
  }

  // 4. Proceed with privacy transaction
  await spyk.deposit('SOL', 1.0);
  await spyk.transfer({
    to: recipientAddress,
    amount: 0.5,
    token: 'SOL',
  });
}
```

### Mock Verifier for Development

When the on-chain verifier program is not available, use the mock verifier:

```typescript
import { noir } from '@spyk-protocol/sdk';

// Create mock verifier (no on-chain program required)
const mockVerifier = noir.createMockNoirVerifier();

// Verify proof locally (structural validation only)
const result = await mockVerifier.verifyOnChain(proof);
console.log('Mock verified:', result.verified);
console.log('Mock signature:', result.signature); // mock_<hash>_<timestamp>
```

### Error Handling

```typescript
import { NoirError, NoirErrorCodes } from '@spyk-protocol/sdk';

try {
  const result = await prover.proveCompliance(address);
} catch (error) {
  if (error instanceof NoirError) {
    switch (error.code) {
      case NoirErrorCodes.PROVER_UNAVAILABLE:
        console.log('CLI tools not installed, falling back to mock');
        break;
      case NoirErrorCodes.PROOF_GENERATION_FAILED:
        console.log('Proof generation failed:', error.message);
        break;
      case NoirErrorCodes.VERIFICATION_FAILED:
        console.log('On-chain verification failed');
        break;
      case NoirErrorCodes.TREE_SERVICE_ERROR:
        console.log('Could not fetch OFAC tree');
        break;
    }
  }
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with Helius RPC for maximum reliability on Solana.
