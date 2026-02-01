# SPYK Architecture Review - Context for Future Sessions

## Problem Statement (2026-02-01)

The SPYK SDK components feel **standalone and disconnected** rather than composable:

### Current State (Bad)

```
┌─────────────────────────────────────────────────────────────┐
│                    SPYK SDK (Disconnected)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Privacy Cash│  │ ShadowWire  │  │   Arcium    │         │
│  │ (ZK Shield) │  │ (Transfers) │  │ (Enc DeFi)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    NO CONNECTION                            │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │   x402    │                           │
│                    │ (AI Pay)  │                           │
│                    └───────────┘                           │
│                                                             │
│  ┌─────────────┐                                           │
│  │    Noir     │  ← Also standalone, not integrated        │
│  │ (ZK Proofs) │                                           │
│  └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Target State (Good)

```
┌─────────────────────────────────────────────────────────────┐
│                    SPYK SDK (Composable)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                         │
│                    │    Noir     │ ← Compliance at any step│
│                    │ (ZK Proofs) │                         │
│                    └──────┬──────┘                         │
│                           │                                 │
│  ┌─────────────┐    ┌─────┴─────┐    ┌─────────────┐      │
│  │ Privacy Cash│◄──►│   x402    │◄──►│   Arcium    │      │
│  │ (ZK Shield) │    │ (AI Pay)  │    │ (Enc DeFi)  │      │
│  └──────┬──────┘    └───────────┘    └──────┬──────┘      │
│         │                                    │              │
│         └──────────────┬─────────────────────┘              │
│                        │                                    │
│                  ┌─────┴─────┐                             │
│                  │ShadowWire │                             │
│                  │(Transfers)│                             │
│                  └───────────┘                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

COMPOSABLE FLOWS:
1. x402 + Privacy Cash: Pay from shielded balance
2. Arcium + Privacy Cash: Swap shielded funds
3. x402 + Arcium: Swap then pay in one flow
4. Noir: Compliance proofs for any operation
```

## Key Integration Gaps

### 1. x402 + Privacy Cash
**Current:** x402 uses ephemeral keypairs funded from visible wallet
**Target:** x402 withdraws from shielded balance via ZK proof

```typescript
// Current (privacy leak)
await spyk.x402.payPrivately(invoice); // Funds ephemeral from wallet (visible!)

// Target (true privacy)
await spyk.x402.payFromShielded(invoice); // ZK withdraw to ephemeral
```

### 2. Arcium + Privacy Cash
**Current:** Arcium swaps are separate from shielded funds
**Target:** Swap shielded USDC → shielded SOL without exposure

```typescript
// Current (separate operations)
await spyk.withdraw('USDC', 100);
await arcium.swap(100, 'USDC', 'SOL');
await spyk.deposit('SOL', amount);

// Target (composable)
await spyk.swapShielded({ from: 'USDC', to: 'SOL', amount: 100 });
```

### 3. Noir Integration
**Current:** Standalone prover, not integrated into flows
**Target:** Compliance checks as middleware

```typescript
// Current (manual)
const proof = await noir.proveCompliance(address);
// Then manually check before payment...

// Target (integrated)
await spyk.x402.payPrivately(invoice, { requireCompliance: true });
// Automatically proves sender/recipient not sanctioned
```

## Demo Command Problems

### Bad (Current)
```bash
# These are test files, not user commands!
npx tsx test-real-devnet.ts
npx tsx test-full-devnet-flow.ts
```

### Good (Target)
```bash
# Real CLI commands users would run
spyk compliance check <address>
spyk swap quote 100 USDC SOL
spyk pay https://api.example.com --from-shielded
```

## Beads Tasks Created

| ID | Title | Priority |
|----|-------|----------|
| tk-arch | EPIC: Composable Architecture Review | P0 |
| tk-arch.1 | Map current component interactions | P1 |
| tk-arch.2 | Design x402 + Privacy Cash flow | P1 |
| tk-arch.3 | Design Arcium + Privacy Cash flow | P2 |
| tk-arch.4 | Design Noir compliance integration | P2 |
| tk-demo | EPIC: Fix Demo Commands | P0 |
| tk-demo.1 | Add Noir CLI commands | P1 |
| tk-demo.2 | Add Arcium CLI commands | P1 |
| tk-demo.3 | Update QUICK_DEMO.md | P1 |

## Next Steps

1. Run `/beads:bootstrap` to see ready tasks
2. Start with tk-arch.1 to map current state
3. Design composable interfaces
4. Implement CLI commands
5. Update demo docs

## Related Files

- `spyk-sdk/src/spyk.ts` - Main Spyk class
- `spyk-sdk/src/x402/` - x402 client
- `spyk-sdk/src/privacy-cash/` - Privacy Cash wrapper
- `spyk-sdk/src/arcium/` - Arcium integration
- `spyk-sdk/src/noir/` - Noir prover/verifier
- `spyk-demo/src/cli.ts` - CLI commands
- `QUICK_DEMO.md` - Demo guide (needs update)
