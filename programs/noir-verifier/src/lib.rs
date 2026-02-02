use anchor_lang::prelude::*;

declare_id!("3DQaB9s1nTqQPRAK7rw5FrQDTPYCVmuws6UE7MSXFXyN");

/// Noir ZK Proof Verifier for Spyk Protocol
///
/// This program verifies Noir zero-knowledge proofs for OFAC compliance.
/// For the demo, it performs structural validation of the proof.
/// In production, this would perform full cryptographic verification.
#[program]
pub mod noir_verifier {
    use super::*;

    /// Verify a Noir proof for OFAC non-membership
    ///
    /// # Arguments
    /// * `ctx` - The program context
    /// * `proof` - The Noir proof bytes (388 bytes)
    /// * `address` - The address being proven (32 bytes)
    /// * `root` - The merkle root (32 bytes)
    ///
    /// # Returns
    /// * `Ok(())` if verification passes
    /// * `Err` if verification fails
    pub fn verify_proof(
        ctx: Context<VerifyProof>,
        proof: [u8; 388],
        address: [u8; 32],
        root: [u8; 32],
    ) -> Result<()> {
        // Log verification attempt
        msg!("Verifying Noir proof for address: {:?}", &address[..8]);
        msg!("Merkle root: {:?}", &root[..8]);
        msg!("Proof size: {} bytes", proof.len());

        // Structural validation
        // 1. Check proof is not all zeros
        let proof_sum: u32 = proof.iter().map(|&b| b as u32).sum();
        require!(proof_sum > 0, VerifierError::EmptyProof);

        // 2. Check address is not all zeros
        let address_sum: u32 = address.iter().map(|&b| b as u32).sum();
        require!(address_sum > 0, VerifierError::InvalidAddress);

        // 3. Check root is not all zeros
        let root_sum: u32 = root.iter().map(|&b| b as u32).sum();
        require!(root_sum > 0, VerifierError::InvalidRoot);

        // 4. Basic proof structure check (mock verification)
        // In production, this would call actual Noir verifier logic
        // For demo purposes, we verify the proof has expected structure
        let is_valid = verify_proof_structure(&proof, &address, &root);
        require!(is_valid, VerifierError::InvalidProof);

        // Emit verification event
        emit!(ProofVerified {
            address,
            root,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Proof verification successful!");
        Ok(())
    }

    /// Verify proof with result account (stores verification result on-chain)
    pub fn verify_and_store(
        ctx: Context<VerifyAndStore>,
        proof: [u8; 388],
        address: [u8; 32],
        root: [u8; 32],
    ) -> Result<()> {
        // Perform verification
        let proof_sum: u32 = proof.iter().map(|&b| b as u32).sum();
        require!(proof_sum > 0, VerifierError::EmptyProof);

        let address_sum: u32 = address.iter().map(|&b| b as u32).sum();
        require!(address_sum > 0, VerifierError::InvalidAddress);

        let root_sum: u32 = root.iter().map(|&b| b as u32).sum();
        require!(root_sum > 0, VerifierError::InvalidRoot);

        let is_valid = verify_proof_structure(&proof, &address, &root);
        require!(is_valid, VerifierError::InvalidProof);

        // Store result
        let result = &mut ctx.accounts.verification_result;
        result.address = address;
        result.root = root;
        result.verified = true;
        result.timestamp = Clock::get()?.unix_timestamp;
        result.verifier = ctx.accounts.payer.key();

        emit!(ProofVerified {
            address,
            root,
            timestamp: result.timestamp,
        });

        Ok(())
    }
}

/// Verify the structure of a Noir proof
///
/// This is a simplified verification for demo purposes.
/// In production, this would perform full cryptographic verification.
fn verify_proof_structure(proof: &[u8; 388], address: &[u8; 32], root: &[u8; 32]) -> bool {
    // Check proof length
    if proof.len() != 388 {
        return false;
    }

    // Check that proof contains valid data
    // A real proof has specific structure - we check for non-trivial content
    let has_content = proof.iter().any(|&b| b != 0 && b != 0xff);
    if !has_content {
        return false;
    }

    // Check address and root are non-trivial
    let address_valid = address.iter().any(|&b| b != 0);
    let root_valid = root.iter().any(|&b| b != 0);

    address_valid && root_valid
}

#[derive(Accounts)]
pub struct VerifyProof<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyAndStore<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + VerificationResult::INIT_SPACE,
        seeds = [b"verification", payer.key().as_ref()],
        bump
    )]
    pub verification_result: Account<'info, VerificationResult>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VerificationResult {
    /// The address that was verified
    pub address: [u8; 32],
    /// The merkle root at time of verification
    pub root: [u8; 32],
    /// Whether verification passed
    pub verified: bool,
    /// Verification timestamp
    pub timestamp: i64,
    /// Who performed the verification
    pub verifier: Pubkey,
}

#[event]
pub struct ProofVerified {
    pub address: [u8; 32],
    pub root: [u8; 32],
    pub timestamp: i64,
}

#[error_code]
pub enum VerifierError {
    #[msg("Proof is empty or invalid")]
    EmptyProof,

    #[msg("Invalid address provided")]
    InvalidAddress,

    #[msg("Invalid merkle root provided")]
    InvalidRoot,

    #[msg("Proof verification failed")]
    InvalidProof,

    #[msg("Proof has already been verified")]
    AlreadyVerified,
}
