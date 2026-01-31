# TK-VXM: SPYK Protocol - Unified Privacy SDK for Solana

**Plan ID**: tk-vxm
**Project**: spyk-protocol
**Prefix**: tk
**Type**: feature
**Priority**: high
**Status**: processed
**Deadline**: Feb 2, 2026 11:00 AM WIB
**GitHub Org**: https://github.com/spyk-protocol
**Repositories**: spyk-sdk, spyk-demo

## Overview

Build a unified privacy SDK for Solana that wraps Privacy Cash, ShadowWire, and Helius RPC into a single developer-friendly interface. The SDK enables developers to integrate privacy features through 3 lines of code.

**One-liner**: "Unified privacy SDK for Solana - integrate Privacy Cash and ShadowWire with 3 lines of code"

## Context

### Hackathon: Privacy Hack 2026
- **Submission Deadline**: Feb 2, 2026 at 11:00 AM WIB
- **Working Days**: ~5 days (Jan 28 - Feb 1)

### Target Bounties
| Bounty | Prize | Focus |
|--------|-------|-------|
| Privacy Tooling Track | $15k | Main prize |
| Radr Labs Grand Prize | $10k | ShadowWire integration |
| Privacy Cash Best App | $6k | Privacy Cash integration |
| Helius Best Privacy | $5k | Helius RPC usage |
| **Total Potential** | **$36k** | |

### Dependencies
```bash
# Core dependencies
npm install privacycash @radr/shadowwire helius-sdk @solana/web3.js
# Dev dependencies
npm install -D typescript @types/node vitest
# CLI demo dependencies
npm install commander inquirer @types/inquirer
```

### Helius Integration Role

Helius serves multiple purposes in this SDK:

1. **Reliable RPC Connection**: Helius provides high-availability RPC endpoints with better rate limits than public endpoints
2. **Enhanced Transaction Handling**: Helius's `sendSmartTransaction` for optimized transaction landing
3. **Transaction Webhooks**: For monitoring privacy operation completion (optional enhancement)
4. **Priority Fee Estimation**: Helius APIs for optimal fee calculation during high network load

**Bounty Justification**: The SDK uses Helius as the foundational infrastructure layer, demonstrating that privacy tooling benefits from premium RPC services. All privacy operations route through Helius endpoints.

## Requirements

1. **Privacy Cash Wrapper**
   - Shield SOL via `deposit(amount)`
   - Unshield SOL via `withdraw(amount)`
   - Shield USDC via `depositUSDC(amount)`
   - Unshield USDC via `withdrawUSDC(amount)`
   - Query shielded balance via `getPrivateBalance()`

2. **ShadowWire Wrapper**
   - Private transfers via `transfer()` with auto-type selection
   - Internal transfers (fully private)
   - External transfers (sender anonymous)
   - Balance queries via `getBalance(wallet, token)`
   - Support all 13 tokens: SOL, USDC, BONK, RADR, ORE, etc.

3. **Unified Spyk Interface**
   - Auto protocol selection based on token/use case
   - Single entry point for all privacy operations
   - Helius RPC integration for reliable connections

4. **Developer Experience**
   - TypeScript with full type definitions
   - Minimal setup (3 lines to integrate)
   - Clear error handling and status callbacks

5. **Demo & Documentation**
   - CLI demo showcasing all features (using commander + inquirer)
   - README with integration examples
   - API documentation

## Implementation Plan

### Phase 0: Pre-flight Verification (Day 1 First Thing)
1. **BLOCKING**: Verify npm package existence for privacycash and @radr/shadowwire
2. If packages exist: Document actual API signatures
3. If packages don't exist: Execute contingency plan (see Contingency Plans section)
4. No implementation begins until this phase completes

### Phase 1: Project Setup & API Discovery (Day 1 Morning)
1. Initialize monorepo with pnpm workspaces
2. Install all dependencies
3. **Verify actual API signatures** of privacycash and @radr/shadowwire packages
4. Document any deviations from expected APIs in `docs/api-discovery.md`
5. Configure TypeScript, ESLint
6. Set up environment configuration (.env.example, config loader)
7. Create Helius RPC connection helper with sendSmartTransaction support

### Phase 2: Privacy Cash Integration (Day 1)
1. Create `SpykPrivacyCash` class wrapper
2. Implement shield methods (deposit, depositUSDC)
3. Implement unshield methods (withdraw, withdrawUSDC)
4. Implement balance query (getPrivateBalance)
5. Add error handling and transaction status callbacks
6. Write smoke test

### Phase 3: ShadowWire Integration (Day 2 Morning)
1. Create `SpykShadowWire` class wrapper
2. Implement transfer method with type auto-selection
3. Implement balance query with multi-token support
4. Add error handling
5. Write smoke test

### Phase 4: Unified SDK (Day 2 Afternoon)
1. Create main `Spyk` class
2. Implement auto protocol selection logic
3. Add unified transfer/deposit/withdraw methods
4. Export all types and utilities
5. Write integration test

### Phase 5: Demo & Docs (Day 3)
1. Build CLI demo with commander + inquirer
2. Demo flows: deposit, withdraw, transfer, balance check
3. Write README with quick start guide
4. Document all API methods
5. Create integration examples

### Phase 6: Polish & Submit (Day 4-5)
1. Record demo video
2. Final testing on devnet
3. Prepare submission materials
4. Submit before deadline

## Technical Details

### Project Structure
```
packages/
├── sdk/
│   ├── src/
│   │   ├── privacy-cash/
│   │   │   └── index.ts       # Privacy Cash wrapper
│   │   ├── shadowwire/
│   │   │   └── index.ts       # ShadowWire wrapper
│   │   ├── utils/
│   │   │   └── connection.ts  # Helius RPC helper
│   │   ├── types.ts           # Shared types
│   │   ├── config.ts          # SDK configuration
│   │   └── index.ts           # Main Spyk class + exports
│   ├── test/
│   │   ├── privacy-cash.test.ts
│   │   ├── shadowwire.test.ts
│   │   └── spyk.test.ts
│   ├── package.json
│   └── tsconfig.json
├── demo/
│   ├── src/
│   │   └── cli.ts             # Interactive CLI demo
│   └── package.json
├── docs/
│   └── api-discovery.md       # Actual API documentation from Phase 0
├── .env.example
├── package.json               # Workspace root
└── README.md
```

### Environment Configuration
```
# .env.example
HELIUS_API_KEY=your_helius_api_key
SOLANA_NETWORK=devnet
```

### Helius RPC Endpoints
- Devnet: `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
- Mainnet: `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`

### Protocol Selection Logic
```
Token is SOL or USDC → Use Privacy Cash (better liquidity)
Other tokens (BONK, RADR, ORE, etc.) → Use ShadowWire
Internal transfer requested → ShadowWire with type: 'internal'
External transfer requested → ShadowWire with type: 'external'
```

## Contingency Plans

### If npm packages don't exist
1. Check official documentation for alternative package names (e.g., `@privacycash/sdk`, `shadowwire-sdk`)
2. Search GitHub for official SDK repositories
3. If official SDK available but not on npm: Install directly from GitHub
4. If no SDK available: Integrate via direct HTTP/RPC calls using official API docs
5. Document limitations in README

### If APIs differ significantly from expected
1. Pivot wrapper design to match actual APIs
2. Update types.ts to reflect actual method signatures
3. Reduce scope to support only actually available methods
4. Document any limitations or differences in README
5. Prioritize: deposit/withdraw for Privacy Cash, transfer for ShadowWire

### If devnet is unstable
1. Implement mock mode for demo purposes
2. Record demo video during stable window
3. Document known devnet limitations in submission

## Sub-tasks

### Phase 0: Pre-flight (BLOCKING)
- [ ] tk-vxm.0: Verify package existence and document actual APIs
  - Check npm registry for privacycash, @radr/shadowwire
  - If packages exist: Install and inspect exported functions/types
  - If missing: Locate official repos and integration examples
  - Output: `docs/api-discovery.md` with actual API signatures
  - **BLOCKING**: No implementation until this completes

### Phase 1: Setup & Discovery
- [ ] tk-vxm.1: Initialize pnpm monorepo with workspace configuration
  - Files: `package.json`, `pnpm-workspace.yaml`, `packages/sdk/package.json`, `packages/demo/package.json`
- [ ] tk-vxm.2: Configure TypeScript, ESLint, and environment setup
  - Files: `tsconfig.json`, `packages/sdk/tsconfig.json`, `.env.example`, `packages/sdk/src/config.ts`
- [ ] tk-vxm.3: Create Helius RPC connection utility with sendSmartTransaction
  - File: `packages/sdk/src/utils/connection.ts`

### Phase 2: Privacy Cash Integration
- [ ] tk-vxm.4: Implement SpykPrivacyCash shield methods (deposit, depositUSDC)
  - File: `packages/sdk/src/privacy-cash/index.ts`
- [ ] tk-vxm.5: Implement SpykPrivacyCash unshield methods (withdraw, withdrawUSDC)
  - File: `packages/sdk/src/privacy-cash/index.ts`
- [ ] tk-vxm.6: Implement SpykPrivacyCash balance query (getPrivateBalance)
  - File: `packages/sdk/src/privacy-cash/index.ts`
- [ ] tk-vxm.7: Write Privacy Cash smoke test
  - File: `packages/sdk/test/privacy-cash.test.ts`

### Phase 3: ShadowWire Integration
- [ ] tk-vxm.8: Implement SpykShadowWire transfer with auto internal/external selection
  - File: `packages/sdk/src/shadowwire/index.ts`
- [ ] tk-vxm.9: Implement SpykShadowWire balance query with multi-token support
  - File: `packages/sdk/src/shadowwire/index.ts`
- [ ] tk-vxm.10: Write ShadowWire smoke test
  - File: `packages/sdk/test/shadowwire.test.ts`

### Phase 4: Unified SDK
- [ ] tk-vxm.11: Create main Spyk class with unified interface and protocol selection
  - File: `packages/sdk/src/index.ts`
  - Methods: transfer, deposit, withdraw, getBalance (unified)
- [ ] tk-vxm.12: Create shared types and export public API
  - File: `packages/sdk/src/types.ts`
- [ ] tk-vxm.13: Write integration test for Spyk class
  - File: `packages/sdk/test/spyk.test.ts`

### Phase 5: Demo & Documentation
- [ ] tk-vxm.14: Build interactive CLI demo with commander + inquirer
  - File: `packages/demo/src/cli.ts`
  - Flows: deposit, withdraw, transfer, balance check
- [ ] tk-vxm.15: Write README with quick start and API documentation
  - File: `README.md`

### Phase 6: Submission
- [ ] tk-vxm.16: Record demo video
- [ ] tk-vxm.17: Final devnet testing and submit before deadline

## Notes

- Focus on devnet first, mainnet support is secondary
- Keep the API surface minimal - simplicity is a feature
- Privacy Cash for SOL/USDC (established liquidity), ShadowWire for everything else
- **Critical**: Task tk-vxm.0 must complete before any implementation - verify actual package APIs first
- Consider adding a simple proxy/facade pattern for future protocol additions

## Risk Factors

1. **API Mismatch**: privacycash and @radr/shadowwire packages may have different APIs than documented. Task tk-vxm.0 mitigates this.
2. **Package Availability**: Packages may not exist on npm. Verify during tk-vxm.0, contingency plan in place.
3. **Devnet Stability**: Privacy protocols on devnet may have intermittent issues
4. **Time Constraint**: 5 days is tight; prioritize core functionality over polish
5. **Documentation Gap**: Third-party SDK docs may be incomplete

## Success Criteria

- [ ] SDK compiles and types are correct
- [ ] Privacy Cash deposit/withdraw works on devnet
- [ ] ShadowWire transfers work on devnet
- [ ] All smoke tests pass
- [ ] CLI demo successfully showcases all features
- [ ] README enables 3-line integration
- [ ] Submission completed before Feb 2, 11 AM WIB

## Beads Created

**Processed**: 2026-01-27
**GitHub Org**: https://github.com/spyk-protocol

### Repository Structure
| Repo | Prefix | Bead Epic |
|------|--------|-----------|
| spyk-sdk | sdk- | tk-308.1 |
| spyk-demo | dm- | tk-308.2 |

### Beads Summary

**Master Epic**: tk-308 - SPYK Protocol - Unified Privacy SDK (Multi-Repo)

#### SDK Repository (spyk-sdk) - tk-308.1
| Bead ID | Task | Phase |
|---------|------|-------|
| tk-308.1.1 | tk-vxm.0: Verify package existence and document APIs | Phase 0 (BLOCKING) |
| tk-308.1.2 | tk-vxm.1: Initialize repo with TypeScript config | Phase 1 |
| tk-308.1.3 | tk-vxm.2: Create Helius RPC connection utility | Phase 1 |
| tk-308.1.4 | tk-vxm.3: Create shared types | Phase 1 |
| tk-308.1.5 | tk-vxm.4: Implement Privacy Cash shield methods | Phase 2 |
| tk-308.1.6 | tk-vxm.5: Implement Privacy Cash unshield methods | Phase 2 |
| tk-308.1.7 | tk-vxm.6: Implement Privacy Cash balance query | Phase 2 |
| tk-308.1.8 | tk-vxm.7: Write Privacy Cash smoke tests | Phase 2 |
| tk-308.1.9 | tk-vxm.8: Implement ShadowWire transfer methods | Phase 3 |
| tk-308.1.10 | tk-vxm.9: Implement ShadowWire balance query | Phase 3 |
| tk-308.1.11 | tk-vxm.10: Write ShadowWire smoke tests | Phase 3 |
| tk-308.1.12 | tk-vxm.11: Create unified Spyk class | Phase 4 |
| tk-308.1.13 | tk-vxm.12: Write integration tests | Phase 4 |
| tk-308.1.14 | tk-vxm.13: Write README with quick start | Phase 5 |

#### Demo Repository (spyk-demo) - tk-308.2
| Bead ID | Task | Phase |
|---------|------|-------|
| tk-308.2.1 | tk-vxm.14: Initialize demo repository | Phase 5 |
| tk-308.2.2 | tk-vxm.15: Build interactive CLI with all flows | Phase 5 |
| tk-308.2.3 | tk-vxm.16: Write demo README | Phase 5 |

#### Submission - tk-308
| Bead ID | Task | Phase |
|---------|------|-------|
| tk-308.3 | tk-vxm.17: Record demo video | Phase 6 |
| tk-308.4 | tk-vxm.18: Final testing and submission | Phase 6 |

### Dependency Graph
```
tk-308.1.1 (API Discovery - BLOCKING)
    │
    ├── tk-308.1.2 (Repo Init)
    │       │
    │       ├── tk-308.1.3 (Helius RPC)
    │       │       │
    │       │       ├── tk-308.1.5 (PC Shield) ────┐
    │       │       │       │                      │
    │       │       │       └── tk-308.1.6 (PC Unshield)
    │       │       │               │              │
    │       │       │               └──────────────┼── tk-308.1.8 (PC Tests)
    │       │       │                              │
    │       │       └── tk-308.1.7 (PC Balance) ───┘
    │       │
    │       └── tk-308.1.4 (Types)
    │               │
    │               └── tk-308.1.9 (SW Transfer) ── PARALLEL WITH Phase 2
    │                       │
    │                       └── tk-308.1.10 (SW Balance)
    │                               │
    │                               └── tk-308.1.11 (SW Tests)
    │
    └── tk-308.1.12 (Unified Spyk) ← waits for PC + SW
            │
            ├── tk-308.1.13 (Integration Tests)
            │
            └── tk-308.1.14 (SDK README)
                    │
                    └── tk-308.2.1 (Demo Init)
                            │
                            └── tk-308.2.2 (CLI Build)
                                    │
                                    ├── tk-308.2.3 (Demo README)
                                    │
                                    └── tk-308.3 (Demo Video)
                                            │
                                            └── tk-308.4 (FINAL SUBMIT)
```

### Parallelization Opportunities
1. **Phase 2 & 3 can run in parallel**: Privacy Cash (tk-308.1.5-8) and ShadowWire (tk-308.1.9-11) are independent
2. **Balance queries parallel with main implementation**: tk-308.1.7 can run alongside tk-308.1.6
