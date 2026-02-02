# SPYK Protocol Roadmap

> Current status and planned features for the SPYK privacy SDK.

---

## Current Features (Working)

These features are implemented and functional:

### Privacy Cash - ZK Shielded Pool
- **Status:** Waiting on Mainnet
- **Tokens:** SOL, USDC
- **Features:**
  - Shield SOL/USDC into zero-knowledge pool
  - Unshield to any address (unlinkable via ZK proofs)
  - Query shielded balance
- **Fees:** 0.5% SOL, 1% USDC
- **Integration:** `privacycash` npm package
- **Note:** Contract built and ready. Currently using mock implementation for demos. Mainnet deployment pending.

### ShadowWire - Private Transfers
- **Status:** Production Ready
- **Tokens:** 20+ SPL tokens (BONK, RADR, ORE, JIM, GODL, etc.)
- **Features:**
  - Internal transfers (fully private)
  - External transfers (sender anonymous)
  - Auto-detection of transfer type
- **Fees:** 0.3-1% depending on token
- **Integration:** `@radr/shadowwire` npm package

### x402 - Private AI Payments
- **Status:** Production Ready
- **Features:**
  - Pay AI APIs without revealing wallet identity
  - Ephemeral keypair generation (one-time use)
  - Shielded-to-ephemeral withdrawal flow
  - HTTP 402 Payment Required protocol support
- **Privacy Model:** API sees payment from random one-time address, no link to real wallet

### Range - Compliance Screening
- **Status:** Production Ready (Opt-In)
- **Features:**
  - OFAC/sanctions pre-screening
  - Address risk assessment
- **Integration:** Range Protocol API

### Helius / Quicknode - RPC Providers
- **Status:** Production Ready
- **Features:**
  - Helius: Primary RPC with sub-100ms latency
  - Quicknode: Alternative provider for redundancy
  - Priority fee management
  - WebSocket support

---

## Experimental Features

These features have partial implementations or are mock-only:

### Arcium - Encrypted DeFi
- **Status:** Experimental
- **Features:**
  - Private swaps with hidden amounts (interface only)
  - Confidential lending (interface only)
- **Note:** Requires Arcium network integration. Currently provides SDK interface for future integration.

---

## Roadmap Features

These features are planned but not yet implemented:

### Real Noir ZK Integration
- **Status:** Roadmap / Mock Implementation
- **Target:** Q2 2026
- **Planned Features:**
  - ZK compliance proofs (OFAC non-membership)
  - On-chain proof verification via Sunspot
  - SMT exclusion circuit for address screening

**Current State:**
The Noir module (`spyk-sdk/src/noir/`) currently provides a **mock implementation** for API design validation. It generates placeholder data, not real cryptographic proofs.

**What's Needed for Real Implementation:**
1. Noir circuit development (`smt_exclusion.nr`)
2. Sunspot CLI integration for proof generation
3. Verifier program deployment to Solana
4. Tree service for OFAC merkle proofs
5. Proving key distribution infrastructure

**Reference:** [solana-foundation/noir-examples](https://github.com/solana-foundation/noir-examples) - Contains working TypeScript client code for Noir on Solana.

### Relayer Network
- **Status:** Planned
- **Target:** Q2 2026
- **Planned Features:**
  - Submit transactions on behalf of users
  - Hides IP address and gas payer identity
  - Decentralized relayer set (no single point of failure)
  - Fee abstraction (pay relay fees from shielded balance)
- **Why:** Without relayers, your public wallet still pays gas, leaking identity

### Agent Spending Limits
- **Status:** Planned
- **Target:** Q2 2026
- **Planned Features:**
  - Per-agent daily/weekly spending caps
  - Token allowlists (agent can only spend USDC, not SOL)
  - Revocable agent permissions
  - Multi-sig approval for large amounts
- **Why:** AI agents need guardrails before enterprises trust them with funds

### Wallet Adapter Plugin
- **Status:** Planned
- **Target:** Q2 2026
- **Planned Features:**
  - Plugin for @solana/wallet-adapter ecosystem
  - Phantom, Solflare, Backpack users get Spyk privacy features
  - "Send Privately" option in any integrated dApp
  - Shielded balance view alongside public balance
  - One-click shield/unshield from existing wallet UI
- **Integration:** Drop-in replacement for standard wallet adapter
- **Benefit:** Leverage existing wallet user bases instead of competing

### SilentSwap - Private DEX
- **Status:** Research
- **Target:** TBD
- **Planned Features:**
  - Private swaps using ZK proofs
  - Hidden amounts and trading patterns
  - Integration with existing DEX liquidity

---

## Version History

| Version | Date | Notable Changes |
|---------|------|-----------------|
| 0.1.0 | 2026-01 | Initial SDK with Privacy Cash, ShadowWire |
| 0.2.0 | 2026-02 | Added x402 private AI payments |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose new features or help implement roadmap items.
