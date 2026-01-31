# TK-SPN: Additional Sponsor Integrations

**Plan ID**: tk-spn
**Project**: spyk-protocol
**Prefix**: tk-
**Type**: feature
**Priority**: high
**Status**: processed
**Base Branch**: origin/feature/tk-402-private-ai-payments
**Parent Epic**: tk-402 (extends sponsor coverage)
**Branch**: feature/tk-402-private-ai-payments

## Overview

Expand SPYK-402 sponsor coverage to maximize hackathon bounty potential. Phase 1 implements quick-win integrations (Quicknode, Starpay, Range, Encrypt.trade). Phase 2 investigates compatibility of more complex integrations (Aztec/Noir, SilentSwap) before committing to implementation.

## Context

### Current State
- SPYK-402 already integrates: Privacy Cash, ShadowWire, Helius, x402
- Current bounty potential: ~$35k
- Additional sponsors identified with varying complexity

### Opportunity
- 6 additional sponsors could add $23k+ in bounties
- Some are quick documentation/config changes
- Others require compatibility research first

### Sponsor Bounty Details

| Sponsor | Prize Pool | Category |
|---------|------------|----------|
| Quicknode | $3,000 | Public Benefit Prize - open-source tooling |
| Starpay | $3,500 | Privacy-Focused Payments |
| Range | $1,500+ | Compliant Privacy |
| Encrypt.trade | $1,000 | Privacy Education |
| Aztec/Noir | $10,000 | ZK with Noir |
| SilentSwap | $5,000 | Private Cross-Chain Transfers |

## Requirements

### Phase 1: Quick Wins (Must Complete)
1. Add Quicknode as alternative RPC provider option
2. Document Starpay alignment with x402 payment flow
3. Add privacy education section explaining AI payment surveillance
4. Integrate Range compliance pre-screening (opt-in)

### Phase 2: Research (Investigation Only)
5. Research Aztec/Noir + Sunspot compatibility with SPYK flow
6. Research SilentSwap API accessibility and cross-chain integration feasibility

## Implementation Plan

### Phase 1: Quick Wins

#### 1. Quicknode RPC Integration
- Add `QUICKNODE_URL` environment variable support
- Update `createConnection()` to accept provider choice
- Test with Privacy Cash and ShadowWire operations
- Update README with Quicknode setup instructions

#### 2. Starpay Documentation
- Add Starpay section to README under Sponsor Integrations
- Document how x402 payment flow aligns with Starpay's privacy-focused payments
- Mention card issuance and ZK swap potential use cases

#### 3. Encrypt.trade Privacy Education
- Add new section: "Why Privacy Matters for AI Payments"
- Explain wallet surveillance and transaction analysis
- Describe how competitors can analyze payment patterns
- Show how SPYK breaks the on-chain link

#### 4. Range Compliance Integration
- Add optional `RangeCompliance` class
- Implement `preScreen(address)` before payments
- Add `RANGE_API_KEY` environment variable
- Document opt-in compliance mode
- Keep disabled by default (user enables)

### Phase 2: Research Tasks

#### 5. Aztec/Noir Investigation
Research questions to answer:
- Can Noir/Sunspot ZK proofs run alongside Privacy Cash?
- Is the blacklist exclusion proof from solana-foundation/noir-examples usable?
- What's the integration complexity for ZK payment receipts?
- Does this add value beyond Privacy Cash's existing ZK?

Deliverable: Written report with compatibility assessment and recommendation

#### 6. SilentSwap Investigation
Research questions to answer:
- Is SilentSwap API publicly accessible or requires partnership?
- Can we integrate cross-chain swaps into x402 payment flow?
- What chains are supported (confirm Solana is live)?
- What are the fees and timing implications?

Deliverable: Written report with API assessment and recommendation

## Technical Details

### Quicknode Integration
```typescript
// spyk-sdk/src/config.ts
export type RpcProvider = 'helius' | 'quicknode' | 'custom';

export interface SpykConfig {
  rpcProvider?: RpcProvider;
  heliusApiKey?: string;
  quicknodeUrl?: string;
  customRpcUrl?: string;
}

// Connection factory
export function createConnection(config: SpykConfig): Connection {
  switch (config.rpcProvider) {
    case 'quicknode':
      return new Connection(config.quicknodeUrl!);
    case 'helius':
    default:
      return createHeliusConnection(config.heliusApiKey!);
  }
}
```

### Range Compliance (Optional)
```typescript
// spyk-sdk/src/compliance/range.ts
export class RangeCompliance {
  async preScreen(address: string): Promise<ComplianceResult> {
    // Call Range API for OFAC/sanctions check
    // Returns { compliant: boolean, reason?: string }
  }
}

// Usage in x402 flow (opt-in)
if (config.enableCompliance) {
  const result = await range.preScreen(invoice.recipient);
  if (!result.compliant) {
    throw new ComplianceError(result.reason);
  }
}
```

### Documentation Sections

#### Encrypt.trade Section (README)
```markdown
## Why Privacy Matters for AI Payments

### The Surveillance Problem
Every Solana transaction is permanently public. When AI agents make payments:
- Payment recipients are visible
- Payment amounts are visible
- Payment frequency is trackable
- Your wallet address links all activity

### What Competitors Can Learn
- Which APIs and services you use
- How much you spend on AI compute
- Your usage patterns and peak times
- Business intelligence from payment analysis

### How SPYK Protects You
1. **Shielded Funds**: Zero-knowledge proofs hide the source
2. **Ephemeral Keypairs**: Each payment uses a new address
3. **No On-Chain Link**: Payments can't be traced to your wallet
```

## Sub-tasks

### Phase 1: Quick Wins
- [ ] tk-spn.1: Add Quicknode RPC provider support (~1 hour)
  - **Prerequisite**: Sign up at quicknode.com, create free Solana devnet endpoint
  - File: `spyk-sdk/src/config.ts`
  - Add `RpcProvider` type and update `SpykConfig` interface
  - Update connection factory to support quicknode/helius/custom
- [ ] tk-spn.2: Test Quicknode with Privacy Cash + ShadowWire (~30 min)
  - Set `QUICKNODE_URL` env variable
  - Run `pnpm test:smoke` to verify all operations work
  - Document any differences in behavior
- [ ] tk-spn.3: Add Starpay documentation section (~30 min)
  - File: `README.md` (root, under "Sponsor Integrations" section)
  - Document x402 alignment with Starpay's privacy-focused payments
  - Include Starpay website link
- [ ] tk-spn.4: Write privacy education docs (Encrypt.trade) (~1 hour)
  - File: `README.md` (root, new section "Why Privacy Matters for AI Payments")
  - Explain surveillance problem, competitor intelligence, SPYK protection
  - Use the template from Technical Details section
- [ ] tk-spn.5: Verify Range API access and implement compliance pre-screening (~2 hours)
  - First: Check Range website/docs for public API availability
  - **If accessible**: Implement `RangeCompliance` class in `spyk-sdk/src/compliance/range.ts`
  - **If not accessible**: Add "Range (Coming Soon)" section to `README.md` under "Future Integrations"
- [ ] tk-spn.6: Final documentation review and consistency check (~30 min)
  - File: `README.md` (root)
  - Verify all new sponsor sections are properly formatted
  - Check links work, ensure sponsor names are correct
  - Add any missing cross-references between sections

### Phase 2: Research
- [ ] tk-spn.7: Research Aztec/Noir + Sunspot compatibility (~3 hours)
  - Deliverable: `.beads/research/aztec-noir-compatibility.md`
  - Must answer: Can it run alongside Privacy Cash? Is blacklist exclusion usable? Integration complexity?
  - End with clear YES/NO recommendation and estimated implementation effort if YES
- [ ] tk-spn.8: Research SilentSwap API and cross-chain feasibility (~2 hours)
  - Deliverable: `.beads/research/silentswap-feasibility.md`
  - Must answer: Is API public? Is Solana supported? Fees and timing?
  - End with clear YES/NO recommendation and estimated implementation effort if YES

## Dependencies

### Internal
```
Phase 1 (parallel execution possible):
tk-spn.1 → tk-spn.2 (test after implementation)
tk-spn.3 (standalone)
tk-spn.4 (standalone)
tk-spn.5 (standalone)
tk-spn.1 + tk-spn.3 + tk-spn.4 + tk-spn.5 → tk-spn.6 (docs consolidation)

Phase 2 (independent research):
tk-spn.7 (standalone investigation)
tk-spn.8 (standalone investigation)
```

### External Dependencies
- Quicknode account/endpoint for testing (free tier available)
- Range API key (verify availability first in tk-spn.5)
- SilentSwap API documentation (to be discovered in tk-spn.8)
- Noir/Sunspot toolchain: Nargo 1.0.0-beta.13, Go 1.24+ (for tk-spn.7)

### Research Output Location
- Phase 2 reports go to: `.beads/research/`
- Create directory if it doesn't exist

## Success Criteria

### Phase 1 Complete When:
- [ ] Quicknode RPC works with all SDK operations
- [ ] Starpay section in README
- [ ] Privacy education section in README
- [ ] Range compliance is opt-in functional
- [ ] All sponsor mentions in documentation

### Phase 2 Complete When:
- [ ] Aztec/Noir report delivered with clear recommendation
- [ ] SilentSwap report delivered with clear recommendation
- [ ] Decision made on whether to proceed with implementation

## Bounty Potential

| Phase | Sponsors | Potential |
|-------|----------|-----------|
| Phase 1 | Quicknode + Starpay + Range + Encrypt.trade | $9,000 |
| Phase 2 (if compatible) | Aztec/Noir + SilentSwap | $15,000 |
| **Total** | All 6 sponsors | **$24,000** |

Combined with existing integrations (~$35k), total potential: **$59,000+**

## Notes

- Phase 1 tasks can run in parallel - no blocking dependencies
- Phase 2 is research only - no implementation until reports reviewed
- Quicknode is open-source requirement - good fit for our MIT-licensed SDK
- Range integration should be opt-in to avoid blocking payments by default
- Demo video should mention all integrated sponsors for maximum bounty coverage

---

## Beads Created

**Date Processed**: 2026-01-29

### Branch Info
- **Base Branch**: origin/feature/tk-402-private-ai-payments
- **Working Branch**: feature/tk-402-private-ai-payments

### Epic
- `tk-4bt`: tk-spn: Additional Sponsor Integrations

### Phase 1 Tasks (Quick Wins)
| ID | Task | Labels | Blocked By |
|----|------|--------|------------|
| tk-4bt.1 | Add Quicknode RPC provider support | backend | - |
| tk-4bt.2 | Test Quicknode with Privacy Cash + ShadowWire | backend | tk-4bt.1 |
| tk-4bt.3 | Add Starpay documentation section | docs | - |
| tk-4bt.4 | Write privacy education docs (Encrypt.trade) | docs | - |
| tk-4bt.5 | Verify Range API access and implement compliance | backend | - |
| tk-4bt.6 | Final documentation review and consistency check | docs | tk-4bt.1, .3, .4, .5 |

### Phase 2 Tasks (Research)
| ID | Task | Labels | Blocked By |
|----|------|--------|------------|
| tk-4bt.7 | Research Aztec/Noir + Sunspot compatibility | research | - |
| tk-4bt.8 | Research SilentSwap API and cross-chain feasibility | research | - |

### Dependency Graph
```
Phase 1 (Parallel):
  tk-4bt.1 ──────┬──→ tk-4bt.2
                 │
  tk-4bt.3 ──────┼──→ tk-4bt.6 (final docs review)
  tk-4bt.4 ──────┤
  tk-4bt.5 ──────┘

Phase 2 (Independent):
  tk-4bt.7 (Aztec/Noir research)
  tk-4bt.8 (SilentSwap research)
```

### Parallelization Opportunities
- **Wave 1**: tk-4bt.1, tk-4bt.3, tk-4bt.4, tk-4bt.5, tk-4bt.7, tk-4bt.8 (6 tasks can run in parallel)
- **Wave 2**: tk-4bt.2 (after tk-4bt.1)
- **Wave 3**: tk-4bt.6 (after tk-4bt.1, .3, .4, .5)
