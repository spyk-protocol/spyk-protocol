# SPYK-402 Demo Checklist

## Pre-Demo Setup

### 1. Wallet Preparation
- [ ] Get devnet SOL from faucet: `solana airdrop 2 --url devnet`
- [ ] Check balance: `solana balance --url devnet`
- [ ] Pre-shield 0.1 SOL for demo payments (if using real shielding)
- [ ] Verify wallet has clean Solscan history (no recent public transactions)

### 2. Environment Setup
- [ ] Terminal with clean scrollback
- [ ] Claude Code running with MCP configured
- [ ] spyk-web running: `cd spyk-web && npm run dev`
- [ ] Browser tabs ready:
  - Solscan (your wallet address)
  - localhost:3000 (spyk-web)

### 3. MCP Configuration
Verify your `~/.claude/settings.json` includes:
```json
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

### 4. Test Run
- [ ] Run smoke test: `SPYK_USE_MOCK_FACILITATOR=true npm run test:smoke`
- [ ] Verify tools work: Ask Claude "What's my SPYK balance?"
- [ ] Test payment flow: Ask Claude to access premium API

## Demo Script

### Opening (30 seconds)
"Hi, I'm demonstrating SPYK-402 - private AI payments on Solana.

Today's AI agents need to make payments, but every transaction leaves a public trail.
SPYK lets Claude make x402 payments without revealing your identity."

### Demo Flow (2 minutes)

**Step 1: Show the Problem**
1. Open Solscan - show your wallet
2. "Every transaction is public. Anyone can see what you're paying for."

**Step 2: Shield Funds**
1. Ask Claude: "Shield 0.05 SOL for private payments"
2. Show the shielding transaction
3. "Now these funds are in the private pool"

**Step 3: Access Premium API**
1. Ask Claude: "Access the premium weather data at localhost:3000/api/premium-data"
2. Claude will:
   - Hit 402 Payment Required
   - Make private payment using shielded funds
   - Return the data

**Step 4: Show Privacy**
1. Refresh Solscan
2. "No new transactions visible. The payment came from an ephemeral address."
3. "Claude got the data without revealing who paid."

### Closing (30 seconds)
"This is SPYK-402: privacy-preserving payments for AI agents.

Built on Solana with Privacy Cash for shielding,
x402 for the payment protocol,
and MCP for Claude integration.

Thank you!"

## Technical Notes

### Mock Mode
For demo reliability, use mock facilitator:
```bash
SPYK_USE_MOCK_FACILITATOR=true
```

Mock proofs start with `mock_` and are always accepted.

### If Things Go Wrong
- API not responding: Check spyk-web is running
- Tools not showing: Restart Claude Code
- Balance errors: Airdrop more devnet SOL

### Screen Recording
- Resolution: 1920x1080
- Font size: Large enough to read
- Show terminal and browser side-by-side
- Record system audio if explaining

## Files Ready
- [x] MCP server built: `spyk-sdk/mcp/dist/`
- [x] API endpoint: `spyk-web/app/api/premium-data/route.ts`
- [x] Smoke test: `spyk-sdk/test/smoke-test.ts`
- [x] Documentation: `spyk-sdk/mcp/README.md`
