# SPYK MCP Server

MCP (Model Context Protocol) server for SPYK Protocol integration with Claude Code.

**Privacy-preserving x402 payments directly from Claude.**

## Features

- **spyk_balance** - Check shielded and public balance
- **spyk_shield** - Shield funds for private payments
- **spyk_pay** - Pay for x402 APIs privately using shielded funds

## Quick Start

### 1. Build the Server

```bash
cd spyk-sdk/mcp
npm install
npm run build
```

### 2. Configure Your Wallet

Copy the environment template:

```bash
cp .env.example .env
```

Configure one of these wallet options in `.env`:

```bash
# Option 1: Base58 private key
SPYK_PRIVATE_KEY=your_base58_private_key_here

# Option 2: Solana CLI keypair file (recommended)
SPYK_KEYPAIR_PATH=~/.config/solana/id.json
```

### 3. Add to Claude Code

Create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "spyk": {
      "command": "node",
      "args": ["/absolute/path/to/spyk-sdk/mcp/dist/index.js"],
      "env": {
        "SPYK_NETWORK": "devnet",
        "SPYK_KEYPAIR_PATH": "~/.config/solana/id.json",
        "SPYK_USE_MOCK_FACILITATOR": "true"
      }
    }
  }
}
```

**Example with real path:**

```json
{
  "mcpServers": {
    "spyk": {
      "command": "node",
      "args": ["/Users/yourname/projects/spyk-sdk/mcp/dist/index.js"],
      "env": {
        "SPYK_NETWORK": "devnet",
        "SPYK_KEYPAIR_PATH": "~/.config/solana/id.json",
        "SPYK_USE_MOCK_FACILITATOR": "true"
      }
    }
  }
}
```

For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spyk": {
      "command": "node",
      "args": ["/absolute/path/to/spyk-sdk/mcp/dist/index.js"],
      "env": {
        "SPYK_NETWORK": "devnet",
        "SPYK_PRIVATE_KEY": "your_base58_private_key"
      }
    }
  }
}
```

### 4. Verify Installation

Restart Claude Code, then ask:

```
What's my SPYK balance?
```

Claude should use the `spyk_balance` tool and show your balances.

## Available Tools

### spyk_balance

Check shielded (private) and public balance.

**Input:**
- `token` (optional): `"SOL"` or `"USDC"`. Defaults to SOL.

**Output:**
```json
{
  "shielded": "0.0500 SOL",
  "public": "1.2340 SOL",
  "token": "SOL"
}
```

### spyk_shield

Shield funds for private payments.

**Input:**
- `amount` (required): Amount to shield
- `token` (optional): `"SOL"` or `"USDC"`. Defaults to SOL.

**Output:**
```json
{
  "success": true,
  "signature": "5xKj...",
  "amount": "0.1 SOL"
}
```

### spyk_pay

Pay for an x402 API privately.

**Input:**
- `url` (required): URL that returned 402
- `maxAmount` (optional): Maximum SOL to pay. Defaults to 0.01 SOL.

**Output:**
```json
{
  "success": true,
  "paid": true,
  "proof": "mock_1706...",
  "amount": "0.001 SOL",
  "data": { ... }
}
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SPYK_PRIVATE_KEY` | Base58-encoded private key | - |
| `SPYK_KEYPAIR_PATH` | Path to Solana keypair file | `~/.config/solana/id.json` |
| `SPYK_NETWORK` | Solana network | `devnet` |
| `SPYK_RPC_URL` | Custom RPC URL | Public endpoint |
| `SPYK_USE_MOCK_FACILITATOR` | Use mock x402 payments | `false` |
| `SPYK_ACCEPT_ALL_PROOFS` | Accept any payment proof | `false` |

## Demo Mode

For testing without real payments, enable mock mode:

```bash
SPYK_USE_MOCK_FACILITATOR=true
```

In mock mode:
- `spyk_pay` generates mock payment proofs
- Proofs start with `mock_` and are always accepted
- No real funds are transferred

## Development

```bash
npm run dev   # Watch mode
npm run build # Build for production
npm start     # Run production build
```

## Troubleshooting

### "No wallet configured"

Set either `SPYK_PRIVATE_KEY` or `SPYK_KEYPAIR_PATH` in your environment.

### "Failed to connect to RPC"

Check your `SPYK_RPC_URL` or ensure you have internet access for the public endpoint.

### "Permission denied"

Ensure the keypair file is readable and contains a valid Solana keypair.

### Tools not showing in Claude

1. Verify the path in your MCP config is absolute
2. Check the server starts without errors: `node dist/index.js`
3. Restart Claude Code after config changes

## Architecture

```
spyk-sdk/mcp/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── tools/            # Tool implementations
│   │   ├── spyk_balance.ts
│   │   ├── spyk_shield.ts
│   │   └── spyk_pay.ts
│   └── config/
│       └── wallet.ts     # Wallet configuration
├── dist/                 # Built files
├── package.json
└── .env.example
```

## Security Notes

- **Never commit** `.env` files or private keys
- Use **devnet** for development and testing
- Review transaction requests before approval
- Keep your keypair file secure with appropriate permissions
