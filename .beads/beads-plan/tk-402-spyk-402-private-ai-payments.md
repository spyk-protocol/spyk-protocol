# TK-402: SPYK-402 Private Payments for AI Agents

**Plan ID**: tk-402
**Project**: spyk-protocol
**Prefix**: tk-
**Type**: feature
**Priority**: high
**Status**: processed
**Parent Epic**: tk-308 (continuation of tk-308.5)
**Base Branch**: feature/tk-vxm-spyk-privacy-sdk
**Branch**: feature/tk-402-private-ai-payments

## Overview

Integrate x402 protocol with SPYK privacy layer to enable **private micropayments for AI agents**. This creates a novel combination: AI agents can autonomously pay for APIs, compute, and data without revealing payment patterns or identity on-chain.

The project includes an MCP server for Claude Code integration, allowing AI assistants to make private payments directly.

## Context

### Current State
- **tk-308.5** (CLOSED): spyk-web browser demo with Privacy Cash + ShadowWire
- **Existing packages**: spyk-sdk, spyk-demo, spyk-web
- x402 protocol fully supports Solana (devnet + mainnet)
- 35M+ x402 transactions processed, $10M+ volume on Solana

### Problem
- AI agents need to pay for resources (APIs, compute, data)
- Every payment leaves an on-chain trace
- Competitors can analyze payment patterns for intelligence
- No existing solution combines x402 + privacy

### Solution
SPYK-402: Private x402 payments via shielded funds + MCP integration for Claude Code

## Hackathon Sponsor Alignment

### Primary Tracks

| Track | Prize | Our Fit |
|-------|-------|---------|
| **Private Payments** | $15,000 | Direct fit - private x402 micropayments |
| **Privacy Tooling** | $15,000 | SDK + MCP infrastructure for developers |
| **Open Track** | $18,000 | Novel AI + privacy combination |

### Sponsor Bounties We Target

| Sponsor | Bounty | Our Usage | Integration Point |
|---------|--------|-----------|-------------------|
| **Privacy Cash** | $15,000 | Shield funds before x402 payment | `SpykPrivacyCash.deposit()` for shielding |
| **Radr/ShadowWire** | $15,000 | Private transfers within x402 flow | `SpykShadowWire.transfer()` for private settlement |
| **Helius** | $5,000 | RPC infrastructure, priority fees | `createHeliusConnection()`, `estimatePriorityFee()` |
| **Quicknode** | $3,000 | Open-source privacy tooling | Entire SDK is open-source |
| **Starpay** | $3,500 | Privacy-focused payment integration | x402 payment flow with privacy |

### Additional Sponsor Opportunities

| Sponsor | Bounty | Potential Use |
|---------|--------|---------------|
| **Inco Lightning** | $6,000 | Confidential payment state |
| **SilentSwap** | $5,000 | Cross-chain private transfers |
| **Arcium** | $10,000 | Confidential DeFi if we add swap |

### Total Bounty Potential: $61,500+

## Requirements

### Functional Requirements
1. x402 client that pays from shielded balance (not public wallet)
2. MCP server exposing payment tools (`spyk_pay`, `spyk_balance`, `spyk_shield`) to Claude Code
3. Self-contained demo API that accepts x402 payments
4. Demo flow: AI agent pays privately for API access

### Non-Functional Requirements
1. Works on Solana devnet
2. Sub-second payment verification
3. Open-source (required for hackathon)
4. 3-minute demo video
5. Documentation for running locally

## Implementation Plan

### Phase 1: x402 Integration (SDK)
1. Add `x402-solana` package to spyk-sdk
2. Create `SpykX402Client` class wrapping x402 with privacy
3. Implement `payPrivately()` - shields funds, then pays x402
4. Add fee estimation for combined (shield + x402) flow

### Phase 2: MCP Server (in spyk-sdk/mcp/)
1. Create MCP server package in `spyk-sdk/mcp/`
2. Implement MCP tools: `spyk_pay`, `spyk_balance`, `spyk_shield`
3. Create wallet configuration loader (keypair from .env, network switching)
4. Configure Claude Code integration via `mcp_servers.json`
5. Returns transaction result with Solscan link (or "private - no trace" for shielded)

### Phase 3: Demo Infrastructure
1. Create mock paid API in **spyk-web** (`/api/premium-data`)
2. API returns 402 with x402 payment details
3. After payment verification, returns actual data
4. Include mock x402 facilitator for devnet fallback

### Phase 4: Integration & Demo
1. End-to-end flow: Claude Code → MCP → Private Payment → API
2. Record demo video showing:
   - AI needs data from paid API
   - AI pays privately (shielded → x402)
   - Payment invisible on-chain explorer
   - API responds, AI completes task
3. Polish UI to show payment status

## Technical Details

### x402 Integration
```typescript
import { createClient } from 'x402-solana';
import { SpykPrivacyCash } from '@spyk-protocol/sdk';

class SpykX402Client {
  async payPrivately(invoice: X402Invoice): Promise<string> {
    // 1. Ensure funds are shielded
    await this.privacyCash.ensureShielded(invoice.amount);

    // 2. Create x402 payment from shielded balance
    const payment = await this.createPrivatePayment(invoice);

    // 3. Submit to x402 facilitator
    return await this.x402Client.pay(payment);
  }
}
```

### MCP Server Tools
```typescript
// Tools exposed to Claude Code
const tools = [
  {
    name: 'spyk_pay',
    description: 'Pay for x402 API privately',
    parameters: { url: string, maxAmount: number }
  },
  {
    name: 'spyk_balance',
    description: 'Check shielded balance',
    parameters: { token: 'SOL' | 'USDC' }
  },
  {
    name: 'spyk_shield',
    description: 'Shield funds for private payments',
    parameters: { amount: number, token: string }
  }
];
```

### Demo API (402 Response)
```typescript
// GET /api/premium-data
if (!paymentVerified) {
  return Response.json({
    error: 'Payment Required',
    x402: {
      amount: '0.001',
      token: 'SOL',
      recipient: 'Demo...Address',
      memo: 'premium-data-access'
    }
  }, { status: 402 });
}
```

## Sub-tasks

### Epic: tk-402 - SPYK-402 Private AI Payments

#### Phase 1: x402 Integration (SDK)
- [ ] tk-402.1: Add x402-solana to spyk-sdk dependencies
- [ ] tk-402.2: Create SpykX402Client wrapper class with constructor accepting privacyCash + shadowWire instances
- [ ] tk-402.3: Research x402-solana payment flow - document how 402 response → payment proof → verification works (can run parallel to 402.1/402.2)
  - **Critical question**: How does a shielded balance produce a valid x402 payment signature? (withdrawal to ephemeral? proxy signature?)
- [ ] tk-402.4: Implement shielded-to-x402 bridge - construct x402 payment using shielded balance withdrawal
  - **Done when**: Can call `client.payPrivately(invoice)` and see payment confirmed on devnet

#### Phase 2: MCP Server (in spyk-sdk/mcp/)
- [ ] tk-402.5: Create spyk-sdk/mcp/ directory with MCP server structure
- [ ] tk-402.6: Create wallet configuration loader (.env template, keypair loading, network switching)
- [ ] tk-402.7: Implement MCP tools (spyk_pay, spyk_balance, spyk_shield)
  - **Done when**: `claude --mcp` shows spyk tools, `spyk_balance` returns a value
- [ ] tk-402.8: Document MCP server setup for Claude Code (mcp_servers.json configuration)

#### Phase 3: Demo Infrastructure (in spyk-web)
- [ ] tk-402.9: Build demo paid API endpoint in spyk-web (/api/premium-data with 402 response)
- [ ] tk-402.10: Implement x402 mock facilitator for offline/devnet-unavailable scenarios
- [ ] tk-402.11: Automated smoke test script (shield → pay → verify → receive data)
  - **Done when**: Script runs repeatedly and passes: Claude Code → MCP → shield → pay → API returns data

#### Phase 4: Polish & Submit
- [ ] tk-402.12: Demo preparation (pre-shield balance, fund devnet wallet, verify clean Solscan state)
- [ ] tk-402.13: Record 3-min demo video
- [ ] tk-402.14: Write documentation and README with setup instructions

## Dependencies

### External Packages
- `x402-solana` - x402 protocol for Solana
- `@modelcontextprotocol/sdk` - MCP server SDK
- Existing: `privacycash`, `@radr/shadowwire`

### Internal Dependencies
```
Phase 1 (SDK):
tk-402.1 → tk-402.2 ─┐
                     ├→ tk-402.4
tk-402.3 (research) ─┘

Phase 2 (MCP):
tk-402.5 → tk-402.6 → tk-402.7 → tk-402.8

Phase 3 (Demo):
tk-402.9 → tk-402.10

Integration:
tk-402.4 + tk-402.7 + tk-402.10 → tk-402.11 → tk-402.12 → tk-402.13 → tk-402.14
```

Key blockers:
- tk-402.4 (shielded-to-x402 bridge) blocks integration testing
- tk-402.7 (MCP tools) blocks Claude Code integration
- tk-402.11 (smoke test) blocks demo recording

Parallel tracks:
- Phase 1 (SDK) and Phase 2 (MCP) can run in parallel
- Phase 3 (Demo API) can run in parallel once tk-402.5 starts

## Demo Script (3 minutes)

```
[0:00-0:15] INTRO
"SPYK-402: Private payments for AI agents on Solana"

[0:15-0:45] PROBLEM
"AI agents need to pay for APIs. But every payment is visible."
Show: Solscan with public payment history
"Competitors can see what APIs you use, how often, how much you spend"

[0:45-1:30] SOLUTION
"SPYK-402 combines x402 micropayments with privacy"
Show: Architecture diagram
"Funds are shielded first, then used for x402 payments"
"On-chain: nothing links your wallet to the payment"

[1:30-2:30] DEMO
"Let me show you Claude Code paying for an API privately"
- Open Claude Code terminal (wallet pre-shielded before recording)
- AI requests data from paid API
- 402 response shown with payment required
- AI uses spyk_pay MCP tool
- Show: payment appears nowhere on Solscan (shielded)
- API responds with data, AI completes task

[2:30-3:00] CLOSE
"SPYK-402: One SDK, private payments, AI-ready"
"Built with Privacy Cash, ShadowWire, Helius, x402"
Show: npm install command, GitHub link
```

## Hackathon Submission Checklist

- [ ] Open-source repo (GitHub)
- [ ] Deployed to Solana devnet
- [ ] 3-minute demo video
- [ ] README with setup instructions
- [ ] Sponsor integrations documented
- [ ] Submitted before February 1, 2026

## Notes

### Why This Wins
1. **Novel combination** - No one else has x402 + privacy + AI agents
2. **Multiple sponsor alignment** - Targets 5+ bounties simultaneously
3. **Working demo** - Self-contained, no external API failures
4. **Clear narrative** - "Private payments for AI" is memorable
5. **Infrastructure play** - SDK others can build on

### Grant Continuation (Post-Hackathon)
- Server-side x402 (accept private payments)
- Multi-token support
- Payment streaming
- LangChain/AutoGPT integrations
- Ecosystem partnerships

### Risks
1. x402-solana devnet facilitator availability - mitigate with mock facilitator (tk-402.10)
2. MCP complexity - keep tools minimal (3 tools max: pay, balance, shield)
3. Time constraint - prioritize demo over features (cut tk-402.14 docs if needed)
4. Wallet key security in MCP - use devnet only, document key handling requirements

## Sources

- [Solana Privacy Hack](https://solana.com/privacyhack)
- [x402 Official](https://www.x402.org/)
- [x402 on Solana Guide](https://solana.com/developers/guides/getstarted/intro-to-x402)
- [x402-solana npm](https://www.npmjs.com/package/x402-solana)
- [Coinbase x402 Agents in Action Winners](https://www.coinbase.com/developer-platform/discover/launches/agents-in-action-winners)

## Beads Created

**Processed**: 2026-01-29
**Base Branch**: feature/tk-vxm-spyk-privacy-sdk
**Working Branch**: feature/tk-402-private-ai-payments

### Epic
- `tk-b6y`: tk-402: SPYK-402 Private AI Payments

### Issues (14 tasks)

| Bead ID | Plan Task | Title | Priority |
|---------|-----------|-------|----------|
| tk-b6y.1 | tk-402.1 | Add x402-solana to spyk-sdk dependencies | P0 |
| tk-b6y.2 | tk-402.2 | Create SpykX402Client wrapper class | P0 |
| tk-b6y.3 | tk-402.3 | Research x402-solana payment flow | P1 |
| tk-b6y.4 | tk-402.4 | Implement shielded-to-x402 bridge | P0 |
| tk-b6y.5 | tk-402.5 | Create MCP server directory structure | P0 |
| tk-b6y.6 | tk-402.6 | Create wallet configuration loader | P0 |
| tk-b6y.7 | tk-402.7 | Implement MCP tools | P0 |
| tk-b6y.8 | tk-402.8 | Document MCP server setup | P1 |
| tk-b6y.9 | tk-402.9 | Build demo paid API endpoint | P0 |
| tk-b6y.10 | tk-402.10 | Implement x402 mock facilitator | P1 |
| tk-b6y.11 | tk-402.11 | Automated smoke test script | P0 |
| tk-b6y.12 | tk-402.12 | Demo preparation | P1 |
| tk-b6y.13 | tk-402.13 | Record 3-min demo video | P0 |
| tk-b6y.14 | tk-402.14 | Write documentation and README | P1 |

### Dependency Graph
```
Phase 1 (SDK) - Can start immediately:
  tk-b6y.1 → tk-b6y.2 ─┐
                       ├→ tk-b6y.4 (critical)
  tk-b6y.3 ────────────┘

Phase 2 (MCP) - Can start in parallel with Phase 1:
  tk-b6y.5 → tk-b6y.6 → tk-b6y.7 (critical) → tk-b6y.8

Phase 3 (Demo) - Can start in parallel:
  tk-b6y.9 → tk-b6y.10

Integration (blocked until phases complete):
  tk-b6y.4 + tk-b6y.7 + tk-b6y.10 → tk-b6y.11 → tk-b6y.12 → tk-b6y.13 → tk-b6y.14
```

### Ready to Start (Unblocked)
- `tk-b6y.1`: Add x402-solana dependencies
- `tk-b6y.3`: Research x402 payment flow
- `tk-b6y.5`: Create MCP server structure
- `tk-b6y.9`: Build demo API endpoint

### Critical Path
`tk-b6y.1 → tk-b6y.2 → tk-b6y.4 → tk-b6y.11 → tk-b6y.12 → tk-b6y.13`
