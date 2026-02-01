# TK-H7F: Hackathon Final Push - Real Devnet Everywhere

**Plan ID**: tk-h7f
**Project**: spyk-protocol
**Prefix**: tk
**Type**: feature
**Priority**: high
**Status**: processed
**Base Branch**: feature/tk-402-private-ai-payments
**Working Branch**: feature/tk-402-private-ai-payments

## Overview
Complete SPYK hackathon submission by enabling real devnet transactions in the web demo (SDK usage example) and real ZK compliance proofs. The CLI already works with real devnet txs - web needs to catch up.

## Context
The SPYK Protocol demonstrates privacy-preserving payments on Solana using:
- **Privacy Cash** - ZK shielded pool for SOL/USDC
- **x402** - Private AI API payments via ephemeral keypairs
- **Noir** - ZK compliance proofs (not-on-sanctions-list)
- **Arcium** - Private swaps (MXE not deployed - external dependency)

### Current State
| Component | CLI Status | Web Status |
|-----------|------------|------------|
| Deposit/Withdraw | ✅ Real devnet tx | ❌ Mock only |
| x402 Payment | ✅ Real devnet tx | ❌ Mock only |
| Compliance | ⚠️ Mock (needs nargo) | ❌ Not implemented |
| Balance | ✅ Working | ⚠️ Mock values |

### Already Deployed
- noir_verifier: `9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t`
- Verified txs on Solscan from prior sessions

## Requirements
1. Web demo must produce real Solscan links (like CLI does)
2. Web demo serves as SDK usage example for developers
3. Compliance proofs should work with real nargo if installed
4. Demo should be recordable for hackathon video submission

## Implementation Plan

### Phase 1: Web Hook Real Devnet Support
1. Update `useSpyk` hook to use SDK's `MockPrivacyCash` (which sends real SOL txs)
2. Add `DevnetX402Facilitator` for real ephemeral payments in web
3. Show real Solscan links in UI after transactions

### Phase 2: Real ZK Compliance
1. Document nargo installation (one-liner)
2. Test CLI compliance with real nargo proofs
3. Test on-chain verification with deployed verifier

### Phase 3: Demo Polish
1. Update any hardcoded mock values in web components
2. Ensure error handling for insufficient balance
3. Test full flow: deposit → pay → compliance check

## Technical Details

### Signing Architecture Decision: **API Routes**

**Problem**: SDK expects `Keypair.sign()` but browser wallet adapters provide `signTransaction()`.

**Decision**: Use Next.js API routes with server-side ephemeral keypair for demo purposes.
- `/api/spyk/deposit` - Server creates tx, signs with ephemeral keypair, returns signature
- `/api/spyk/withdraw` - Same pattern
- `/api/spyk/pay` - x402 payment with ephemeral keypair

**Rationale**:
- Faster to implement for hackathon deadline
- Demonstrates SDK usage patterns clearly
- Production would use proper wallet integration (future work)

**Trade-off**: Demo uses server-controlled keypair, not user's wallet. Acceptable for hackathon demo.

**Keypair Configuration**:
- Store base58 private key in `SPYK_DEMO_KEYPAIR` env var
- Fund from devnet faucet once
- All API routes share this keypair

### Web Hook Changes (`src/hooks/useSpyk.ts`)
Current: Returns mock signatures after setTimeout delays
Target: Call API routes that use SDK internally:
```typescript
const deposit = async (amount: number) => {
  const res = await fetch('/api/spyk/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
  return res.json(); // { signature, explorerUrl }
};
```

### Nargo Installation
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

### Files to Create/Modify
**New API Routes:**
- `spyk-web/app/api/spyk/lib.ts` - Shared: keypair from env, SDK instance, error handling
- `spyk-web/app/api/spyk/deposit/route.ts` - POST handler for deposits
- `spyk-web/app/api/spyk/withdraw/route.ts` - POST handler for withdrawals
- `spyk-web/app/api/spyk/pay/route.ts` - POST handler for x402 payments
- `spyk-web/app/api/spyk/balance/route.ts` - GET handler for shielded balance
- `spyk-web/app/api/spyk/compliance/route.ts` - POST handler for compliance proofs

**Existing Files:**
- `spyk-web/src/hooks/useSpyk.ts` - Replace mock logic with fetch calls
- `spyk-web/app/components/PaySection.tsx` - Show Solscan links after payment
- `spyk-web/app/components/DepositSection.tsx` - Show Solscan links after deposit
- `spyk-web/app/components/WithdrawSection.tsx` - Show Solscan links after withdrawal
- `spyk-web/app/components/ComplianceSection.tsx` - New component for compliance proofs (if not exists)

## Sub-tasks

### Phase 1: API Foundation
- [ ] tk-h7f.1: Create shared API lib (`app/api/spyk/lib.ts`) - keypair from env, SDK init, error handler
- [ ] tk-h7f.2: Create `/api/spyk/deposit` route using shared lib
- [ ] tk-h7f.3: Create `/api/spyk/withdraw` route using shared lib
- [ ] tk-h7f.4: Create `/api/spyk/pay` route (x402 ephemeral payment) using shared lib
- [ ] tk-h7f.5: Create `/api/spyk/balance` route using shared lib

### Phase 2: Web Integration
- [ ] tk-h7f.6: Update useSpyk hook to call API routes instead of mock delays
- [ ] tk-h7f.7: Update UI components to display real Solscan transaction links

### Phase 3: Compliance
- [ ] tk-h7f.8: Create `/api/spyk/compliance` route (Noir proof generation)
- [ ] tk-h7f.9: Add compliance proof button to web UI
- [ ] tk-h7f.10: Test CLI compliance with real nargo proof generation
- [ ] tk-h7f.11: Test on-chain Noir verification with deployed verifier

### Phase 4: Validation
- [ ] tk-h7f.12: End-to-end test: web deposit → x402 pay → compliance check → Solscan verification

## Notes
- Arcium swap will remain mock - external dependency (MXE not deployed on devnet)
- Web demo is SDK usage example - should mirror what developers would do
- CLI is already production-ready for devnet demos
- Focus on producing verifiable Solscan links for hackathon judges

## Dependencies

**Phase 1 (parallelizable after .1):**
- tk-h7f.2, .3, .4, .5 all depend on tk-h7f.1 (shared lib)
- tk-h7f.2, .3, .4, .5 can run in parallel once .1 is done

**Phase 2:**
- tk-h7f.6 depends on tk-h7f.2, .3, .4, .5 (all routes must exist)
- tk-h7f.7 depends on tk-h7f.6 (hook must be updated first)

**Phase 3:**
- tk-h7f.8 depends on tk-h7f.1 (shared lib)
- tk-h7f.9 depends on tk-h7f.8 (compliance route must exist)
- tk-h7f.10 and tk-h7f.11 are independent (CLI testing, can run anytime)
- tk-h7f.11 depends on tk-h7f.10 (need proofs before verification)

**Phase 4:**
- tk-h7f.12 depends on tk-h7f.7, tk-h7f.9, tk-h7f.11 (all components ready)

---

## Beads Created

**Processed**: 2026-02-01
**Epic ID**: tk-wru

### Bead IDs
| ID | Title | Priority | Blocked By |
|----|-------|----------|------------|
| tk-wru | Epic: Hackathon Final Push | P0 | - |
| tk-wru.1 | Create shared API lib | P0 | - |
| tk-wru.2 | Create /api/spyk/deposit route | P0 | tk-wru.1 |
| tk-wru.3 | Create /api/spyk/withdraw route | P0 | tk-wru.1 |
| tk-wru.4 | Create /api/spyk/pay route | P0 | tk-wru.1 |
| tk-wru.5 | Create /api/spyk/balance route | P0 | tk-wru.1 |
| tk-wru.6 | Update useSpyk hook | P0 | tk-wru.2,3,4,5 |
| tk-wru.7 | Update UI Solscan links | P1 | tk-wru.6 |
| tk-wru.8 | Create /api/spyk/compliance route | P1 | tk-wru.1 |
| tk-wru.9 | Add compliance proof UI | P1 | tk-wru.8 |
| tk-wru.10 | Test CLI compliance with nargo | P2 | - |
| tk-wru.11 | Test on-chain Noir verification | P2 | tk-wru.10 |
| tk-wru.12 | E2E web demo test | P0 | tk-wru.7,9,11 |

### Dependency Graph
```
Phase 1 (parallel after .1):
  tk-wru.1 ─┬─> tk-wru.2 ─┐
            ├─> tk-wru.3 ─┤
            ├─> tk-wru.4 ─┼─> tk-wru.6 ─> tk-wru.7 ─┐
            ├─> tk-wru.5 ─┘                         │
            └─> tk-wru.8 ─> tk-wru.9 ───────────────┼─> tk-wru.12
                                                    │
Phase 3 (independent):                              │
  tk-wru.10 ─> tk-wru.11 ───────────────────────────┘
```

### Ready to Start
- tk-wru.1 (shared lib) - **START HERE**
- tk-wru.10 (CLI nargo test) - can run in parallel
