# Aztec/Noir + Sunspot Compatibility Assessment

## Executive Summary

**Noir/Sunspot is technically compatible** with Privacy Cash and SPYK's x402 integration. The Solana Foundation's `noir-examples` repository provides ready-to-use SMT exclusion proofs for blacklist checking, and Sunspot enables on-chain Groth16 verification. However, the integration adds **moderate complexity** (estimated 3-5 days) with **limited additional value** beyond what Privacy Cash already provides. The main benefit is bounty eligibility, not significant functionality improvement.

**Recommendation: CONDITIONAL YES** - Proceed only if the hackathon timeline permits and bounty ($10K total with sub-prizes) justifies the effort.

---

## Technical Compatibility Analysis

### Sunspot SDK Status

| Attribute | Value |
|-----------|-------|
| Repository | [reilabs/sunspot](https://github.com/reilabs/sunspot) |
| Last Updated | Active (232 commits on main) |
| Stars / Forks | 32 stars / 1 fork |
| Solana Integration | Active (devnet verified) |
| Noir Version Required | `1.0.0-beta.18` |
| Go Version Required | 1.24+ |
| Security Status | **NOT AUDITED** - "provided as-is" |

**Critical Warning from Sunspot docs:**
> "Sunspot has not been audited yet and is provided as-is. We make no guarantees to its safety or reliability."
> "Setup performs gnark trusted setup with no mitigation for cryptographic toxic waste."

The original URL provided in the task (`https://github.com/moven0831/sunspot-sdk`) returns **404 - NOT FOUND**. The correct Sunspot repository is maintained by Reilabs.

### Solana Foundation noir-examples

| Attribute | Value |
|-----------|-------|
| Repository | [solana-foundation/noir-examples](https://github.com/solana-foundation/noir-examples) |
| Created | December 17, 2025 |
| Stars / Forks | 23 stars / 6 forks |
| Commits | 1 (early stage) |
| Proof Size | 324-388 bytes (all circuits) |

**Available Circuits:**
1. `one/` - Basic assertion (`x != y`)
2. `verify_signer/` - ECDSA secp256k1 signature verification
3. `smt_exclusion/` - **SMT blacklist exclusion proof** (most relevant)

### Privacy Cash Coexistence

**Can both run together?** YES

| Aspect | Privacy Cash | Noir/Sunspot | Conflict? |
|--------|--------------|--------------|-----------|
| ZK System | Proprietary ZK proofs | Groth16 via Sunspot | No |
| Account Model | Uses Solana accounts | Uses Solana accounts | No |
| Transaction Type | Standard Solana txs | Standard Solana txs | No |
| Verification | Off-chain prover | On-chain verifier program | No |

**Key Insight:** They operate at different layers:
- Privacy Cash: Transaction privacy (shield/unshield funds)
- Noir/Sunspot: Computation proofs (prove statements about data)

Both can exist in the same transaction flow. For example:
1. User proves "I'm not on OFAC blacklist" (Noir proof)
2. User withdraws from shielded pool (Privacy Cash)
3. User makes x402 payment

The Noir proof could be verified before or during the x402 payment flow.

---

## Blacklist Exclusion Proof Analysis

### Found: YES

| Attribute | Value |
|-----------|-------|
| Location | `circuits/smt_exclusion/` in noir-examples |
| Proof Type | Sparse Merkle Tree (SMT) non-membership |
| Hash Function | Poseidon |
| Proof Size | 388 bytes |
| On-chain Program | Includes CPI to ZK verifier |

### What It Proves

The `smt_exclusion` circuit proves:
> "My address is NOT in this Merkle tree (blacklist) without revealing which address I am."

This is exactly what OFAC compliance needs: prove exclusion from a sanctioned addresses list.

**SMT Properties:**
- Supports both inclusion AND exclusion proofs
- History independent (order doesn't matter)
- Efficient O(n) space for n elements
- Uses Poseidon hashing (ZK-friendly)

### Usability for SPYK

**Practical Integration:**
1. Maintain an SMT of OFAC/sanctioned addresses (off-chain tree, on-chain root)
2. User generates proof: "my withdrawal address is NOT in this tree"
3. Verifier checks proof on-chain before allowing x402 payment

**Challenges:**
- Who maintains the blacklist tree? (centralization concern)
- How often is the tree updated? (OFAC updates regularly)
- Tree root must be published on-chain for verification

### Relevance Assessment

| Question | Answer |
|----------|--------|
| Solves real problem? | Partially - compliance without revealing identity |
| Better than existing? | Marginal - Range already provides compliance API |
| Bounty requirement? | Yes - this is what the Aztec bounty expects |

---

## Integration Complexity Assessment

### Estimated Effort: 3-5 Days

| Task | Estimate | Complexity |
|------|----------|------------|
| Install Sunspot + Nargo | 0.5 days | Low |
| Adapt smt_exclusion circuit | 1 day | Medium |
| Build blacklist tree service | 1.5 days | Medium |
| Integrate into x402 flow | 1 day | Medium |
| Testing + debugging | 1 day | Medium |

### Required Changes

```
spyk-sdk/
  src/
    noir/                     # NEW module
      circuit/                # Noir circuits (smt_exclusion)
      prover.ts              # Proof generation wrapper
      verifier.ts            # On-chain verification client
      tree-service.ts        # SMT management
    x402/
      SpykX402Client.ts      # Add pre-payment proof verification
    compliance/
      noir-compliance.ts     # NEW - Noir-based compliance checker
```

### Risk Factors

1. **Unaudited code**: Sunspot explicitly warns about security
2. **Beta Noir version**: Requires specific `1.0.0-beta.18`
3. **Trusted setup**: No ceremony, potential toxic waste
4. **Limited community**: Only 1 commit in noir-examples
5. **Go dependency**: Requires Go 1.24+ for Sunspot

---

## Proving Time Performance

### Benchmarks (from Mopro/Aztec)

| Environment | Proving Time | Acceptable? |
|-------------|--------------|-------------|
| MacBook M3 (native) | ~1-2 seconds | YES |
| Mobile (native) | ~10-20 seconds | MARGINAL |
| Browser (WASM) | ~30-60 seconds | NO |

For x402 payments, proving must happen client-side. The ~1-2 second native proving time is acceptable for server-side or CLI usage, but mobile browser UX would suffer.

**Note:** On-chain verification is fast (single transaction), but proof generation is the bottleneck.

---

## Value Proposition vs Existing ZK

### Current SPYK Privacy Stack

| Component | Privacy Feature |
|-----------|-----------------|
| Privacy Cash | Shielded deposits/withdrawals (ZK-based) |
| Ephemeral Keypairs | Unlinkable payments |
| Range Compliance | Centralized API screening |

### What Noir Adds

| Feature | Value | Overlap? |
|---------|-------|----------|
| SMT exclusion proofs | Decentralized compliance | Partial (Range is centralized) |
| Custom circuits | Flexible proofs | New capability |
| On-chain verification | Trustless validation | New capability |

### Is This Redundant?

**Partially.** Privacy Cash already uses ZK proofs for:
- Proving deposit ownership without revealing which deposit
- Private withdrawals

Noir/Sunspot would add:
- Provable statements about the user (e.g., "I'm not sanctioned")
- On-chain verifiable proofs (Privacy Cash verification is off-chain)

**Key Distinction:**
- Privacy Cash: "I can spend this money privately"
- Noir: "I can prove things about myself privately"

These are complementary, not redundant.

---

## Bounty Qualification Analysis

### Aztec/Noir Bounty Details

| Prize | Amount |
|-------|--------|
| Best Overall | $5,000 |
| Best Non-Financial Use | $2,500 |
| Most Creative | $2,500 |
| **Total Pool** | **$10,000** |

Source: [Solana Privacy Hack 2026](https://solana.com/privacyhack)

### Qualification Likelihood

| Criterion | Assessment |
|-----------|------------|
| Uses Noir circuits | YES - smt_exclusion |
| Runs on Solana | YES - via Sunspot |
| Novel use case | MEDIUM - privacy payments with compliance |
| Technical polish | Depends on execution |
| Competition | Unknown |

**Likelihood of winning prize: MEDIUM**

The integration would be functional but not necessarily innovative. Many teams might use smt_exclusion. To stand out, we'd need:
- Clean UX integration
- Real compliance data (not mock)
- Novel circuit modifications

---

## Recommendation

### **CONDITIONAL YES**

Proceed with Noir/Sunspot integration IF:
1. Hackathon deadline permits 3-5 days of work
2. Other higher-priority tasks (Privacy Cash, x402 core) are complete
3. Team accepts unaudited code risk for hackathon demo

### If YES - Implementation Priority

1. **Day 1**: Environment setup (Noir 1.0.0-beta.18, Sunspot, Go 1.24)
2. **Day 2**: Adapt smt_exclusion circuit, generate test proofs
3. **Day 3**: Build minimal blacklist tree service (mock data)
4. **Day 4**: Integrate into x402 flow
5. **Day 5**: Testing, documentation, demo prep

### If NO - Alternative Approaches

1. **Skip Aztec bounty**: Focus on Privacy Cash + x402 core
2. **Range compliance only**: Centralized but works today
3. **Post-hackathon Noir**: Add later when audited/stable

### Bounty Qualification: LIKELY

If we implement, we likely qualify for at least one sub-prize:
- Best Non-Financial Use ($2,500) - compliance is "non-financial"
- Most Creative ($2,500) - privacy + compliance combo

**Best Overall** is less likely without extensive polish.

---

## Research Links

### Primary Resources
- [Noir Documentation](https://noir-lang.org/docs) - Language reference
- [solana-foundation/noir-examples](https://github.com/solana-foundation/noir-examples) - Official examples with SMT exclusion
- [reilabs/sunspot](https://github.com/reilabs/sunspot) - Noir-to-Solana verifier tool
- [Solana Privacy Hack 2026](https://solana.com/privacyhack) - Hackathon details

### Supporting Research
- [Mopro x Noir Benchmarks](https://zkmopro.org/docs/performance/) - Proving time performance
- [Helius ZK on Solana](https://www.helius.dev/blog/zero-knowledge-proofs-its-applications-on-solana) - ZK ecosystem overview
- [x402 Protocol](https://www.x402.org/) - Payment protocol specification
- [awesome-privacy-on-solana](https://github.com/catmcgee/awesome-privacy-on-solana) - Privacy resources

### Dead Ends
- `https://github.com/moven0831/sunspot-sdk` - **404 NOT FOUND** (URL in task was incorrect)

---

## Acceptance Criteria Checklist

- [x] Report created at `.beads/research/aztec-noir-compatibility.md`
- [x] Q1: Can Noir/Sunspot proofs run alongside Privacy Cash? **YES**
- [x] Q2: Is the blacklist exclusion proof usable? **YES** - smt_exclusion in noir-examples
- [x] Q3: Integration complexity for ZK payment receipts? **3-5 days, medium complexity**
- [x] Q4: Value beyond Privacy Cash's existing ZK? **Marginal - decentralized compliance, on-chain verification**
- [x] Clear YES/NO recommendation with rationale: **CONDITIONAL YES**
- [x] Implementation estimate: **3-5 days**
- [x] Research links documented (including dead ends)
