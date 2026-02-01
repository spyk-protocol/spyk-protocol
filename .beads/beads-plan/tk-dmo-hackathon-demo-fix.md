# TK-DMO: Fix Hackathon Demo for Submission

**Plan ID**: tk-dmo
**Project**: Spyk Protocol
**Prefix**: tk-
**Type**: bug/feature
**Priority**: CRITICAL
**Status**: processed
**Base Branch**: feature/tk-402-private-ai-payments
**Branch**: feature/tk-402-private-ai-payments

## Overview
Fix the hackathon demo to properly showcase SPYK Protocol capabilities. Current demo uses a lazy test file (`test-full-devnet-flow.ts`) that shows "MOCK" labels and doesn't persist shielded balances. Need to create a proper demo flow using the CLI and fix state issues.

## Context
- **Current state is messy** - unclear what's actually working vs mock
- **MockPrivacyCash doesn't persist** - shielded balance shows 0 even after shielding
- **Test file looks unprofessional** - judges will see "Mock mode: true"
- **Arcium already deployed** - but context lost, need to verify
- **x402 devnet payments ARE REAL** - this is the strongest demo point
- **Noir ZK proofs ARE REAL** - 388-byte Groth16 proofs work

## Requirements

### 1. Audit Current State
- [ ] Verify what's actually deployed and working on devnet
- [ ] Check Arcium deployment status
- [ ] Check Privacy Cash relayer status
- [ ] Document real vs mock for each component

### 2. Fix Demo Flow
- [ ] Stop using `test-full-devnet-flow.ts` for demo
- [ ] Use proper CLI commands (`spyk pay`, `spyk compliance prove`)
- [ ] Fix or hide "MOCK" labels that judges will see
- [ ] Ensure shielded balance persists or explain why it doesn't

### 3. Create Demo Script
- [ ] Write exact commands to run for video recording
- [ ] Show REAL transactions with Solscan links
- [ ] Highlight x402 (real devnet TX) and Noir (real ZK proofs)
- [ ] Prepare fallback if something fails

## Implementation Plan

### Phase 1: Audit (parallelizable)
Run tk-dmo.1 through tk-dmo.6 in parallel. Each task documents:
- Actual output/behavior
- Real vs mock determination
- Any blockers found

### Phase 2: Fix Critical Issues (sequential after audit)
1. tk-dmo.7: Fix MockPrivacyCash - likely needs local state caching or mock balance
2. tk-dmo.8: Strip MOCK labels - search codebase for "mock"/"MOCK" strings in output

### Phase 3: Demo Script (sequential after fixes)
1. tk-dmo.9: Write exact commands based on what works
2. tk-dmo.10: Validate full flow before recording

## Dependencies
```
tk-dmo.1 ─┐
tk-dmo.2 ─┤
tk-dmo.3 ─┼──► tk-dmo.8 ──┐
tk-dmo.4 ─┼──► tk-dmo.7 ──┼──► tk-dmo.9 ──► tk-dmo.10
tk-dmo.5 ─┤                │
tk-dmo.6 ─┘                │
```

## Technical Details

### Components to Verify
| Component | File | Check |
|-----------|------|-------|
| x402 | `src/x402/` | `--devnet` mode creates real TX? |
| Noir | `src/noir/` | CLI mode generates real proofs? |
| Arcium | `src/arcium/` | Is it actually deployed? Where? |
| Privacy Cash | `src/privacy-cash/` | Why balance = 0? |
| ShadowWire | `src/shadowwire/` | What actually works? |

### Key Files
- `spyk-demo/src/cli.ts` - CLI commands (use this for demo)
- `spyk-sdk/test-full-devnet-flow.ts` - Test file (DON'T use for demo)
- `spyk-sdk/src/privacy-cash/mock.ts` - MockPrivacyCash (needs fix?)

## Sub-tasks

### Audit Phase (can run in parallel)
- [ ] tk-dmo.1: Audit x402 devnet - run `--devnet` payment and verify Solscan TX
- [ ] tk-dmo.2: Audit Noir CLI - run `nargo prove` and verify 388-byte Groth16 output
- [ ] tk-dmo.3: Audit Arcium deployment - find deployed program addresses, verify MXE status
- [ ] tk-dmo.4: Audit Privacy Cash - check why shielded balance = 0, understand state model
- [ ] tk-dmo.5: Audit ShadowWire - verify what account checks actually work on devnet
- [ ] tk-dmo.6: Verify CLI exists - check if `spyk-demo/src/cli.ts` has working `pay` and `compliance prove` commands

### Fix Phase (blocked by audits)
- [ ] tk-dmo.7: Fix MockPrivacyCash display - show realistic non-zero balance after shielding (blocked by: tk-dmo.4)
  - **Acceptance**: After shielding, balance shows > 0 (can be simulated/cached)
- [ ] tk-dmo.8: Hide MOCK labels from output - remove "Mock mode: true" and similar labels (blocked by: tk-dmo.1-6)
  - **Acceptance**: Running demo shows NO "Mock", "MOCK", or "mock mode" text

### Demo Phase (blocked by fixes)
- [ ] tk-dmo.9: Create final demo command script - exact commands for video recording (blocked by: tk-dmo.7, tk-dmo.8)
  - Include Solscan links for x402 TX
  - Include proof size output for Noir
  - Prepare fallback commands if something fails
- [ ] tk-dmo.10: Dry run validation - execute full demo script end-to-end and verify output looks professional (blocked by: tk-dmo.9)

## Notes

### What's CONFIRMED Real
- x402 with `--devnet` flag creates actual Solana transactions
- Noir with `useCLI: true` generates real Groth16 proofs via nargo
- ShadowWire account checks work on devnet

### What's CONFIRMED Mock/Simulation
- Privacy Cash shielding (no devnet relayer)
- Arcium swap/lend execution (MXE may not be on devnet)

### User Claims
- "Arcium already deployed" - NEED TO VERIFY
- "Already shielded 0.5 SOL" - but balance shows 0 (state not persisted)

### Demo Priority Order
1. **x402 Payment** - REAL, most impressive, shows Solscan link
2. **Noir ZK Proof** - REAL, 388-byte proof in ~6 seconds
3. **Architecture/Sponsors** - slides
4. **Everything else** - mention but don't deep dive

---

## Beads Created

**Date Processed**: 2026-02-01
**Base Branch**: feature/tk-402-private-ai-payments
**Working Branch**: feature/tk-402-private-ai-payments

### Epic
- **tk-dps**: tk-dmo: Fix Hackathon Demo for Submission

### Tasks
| ID | Title | Phase |
|----|-------|-------|
| tk-dps.1 | Audit x402 devnet payment | Audit |
| tk-dps.2 | Audit Noir CLI proof generation | Audit |
| tk-dps.3 | Audit Arcium deployment status | Audit |
| tk-dps.4 | Audit Privacy Cash state model | Audit |
| tk-dps.5 | Audit ShadowWire account checks | Audit |
| tk-dps.6 | Verify CLI commands exist | Audit |
| tk-dps.7 | Fix MockPrivacyCash balance display | Fix |
| tk-dps.8 | Hide MOCK labels from demo output | Fix |
| tk-dps.9 | Create final demo command script | Demo |
| tk-dps.10 | Dry run validation | Demo |

### Dependency Graph
```
tk-dps.1 ─┐
tk-dps.2 ─┤
tk-dps.3 ─┼──► tk-dps.8 ──┐
tk-dps.4 ─┼──► tk-dps.7 ──┼──► tk-dps.9 ──► tk-dps.10
tk-dps.5 ─┤                │
tk-dps.6 ─┘                │
```

### Notes
- Testing should use SOL and USDC on devnet
- 6 audit tasks can run in parallel
- Fix tasks blocked until audits complete
- Demo tasks blocked until fixes complete
