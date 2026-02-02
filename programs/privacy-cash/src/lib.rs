use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

// Program ID - will be replaced after deployment
solana_program::declare_id!("F1Cupu6BN6uaGYX2vrHQrqRKYJcs4Yr5YCo7yryc4XVR");

/// Instruction enum for the Privacy Cash program
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum PrivacyCashInstruction {
    /// Initialize a shielded account for the user
    /// Accounts: [signer, shielded_account, system_program]
    Initialize,

    /// Shield (deposit) SOL
    /// Accounts: [signer, shielded_account, vault, system_program]
    ShieldSol { amount: u64 },

    /// Unshield (withdraw) SOL
    /// Accounts: [signer, shielded_account, vault, system_program]
    UnshieldSol { amount: u64 },

    /// Get balance (logs to program output)
    /// Accounts: [shielded_account]
    GetBalance,
}

/// Shielded account state
#[derive(BorshSerialize, BorshDeserialize, Debug, Default)]
pub struct ShieldedAccount {
    pub owner: Pubkey,
    pub sol_balance: u64,
    pub usdc_balance: u64,
    pub bump: u8,
    pub initialized: bool,
}

impl ShieldedAccount {
    pub const SIZE: usize = 32 + 8 + 8 + 1 + 1; // owner + sol + usdc + bump + initialized
}

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = PrivacyCashInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        PrivacyCashInstruction::Initialize => process_initialize(program_id, accounts),
        PrivacyCashInstruction::ShieldSol { amount } => process_shield_sol(program_id, accounts, amount),
        PrivacyCashInstruction::UnshieldSol { amount } => process_unshield_sol(program_id, accounts, amount),
        PrivacyCashInstruction::GetBalance => process_get_balance(accounts),
    }
}

fn process_initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let user = next_account_info(account_iter)?;
    let shielded_account = next_account_info(account_iter)?;
    let system_program = next_account_info(account_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive PDA for shielded account
    let (expected_pda, bump) = Pubkey::find_program_address(
        &[b"shielded", user.key.as_ref()],
        program_id,
    );

    if expected_pda != *shielded_account.key {
        msg!("Invalid shielded account PDA");
        return Err(ProgramError::InvalidAccountData);
    }

    // Create the account if it doesn't exist
    if shielded_account.data_is_empty() {
        let rent = Rent::get()?;
        let space = ShieldedAccount::SIZE;
        let lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                user.key,
                shielded_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[user.clone(), shielded_account.clone(), system_program.clone()],
            &[&[b"shielded", user.key.as_ref(), &[bump]]],
        )?;

        // Initialize the account data
        let account_data = ShieldedAccount {
            owner: *user.key,
            sol_balance: 0,
            usdc_balance: 0,
            bump,
            initialized: true,
        };

        account_data.serialize(&mut &mut shielded_account.data.borrow_mut()[..])?;
        msg!("Initialized shielded account for {}", user.key);
    } else {
        msg!("Shielded account already exists");
    }

    Ok(())
}

fn process_shield_sol(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let user = next_account_info(account_iter)?;
    let shielded_account = next_account_info(account_iter)?;
    let vault = next_account_info(account_iter)?;
    let system_program = next_account_info(account_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if amount == 0 {
        msg!("Amount must be greater than 0");
        return Err(ProgramError::InvalidArgument);
    }

    // Verify shielded account PDA
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[b"shielded", user.key.as_ref()],
        program_id,
    );

    if expected_pda != *shielded_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify vault PDA
    let (expected_vault, _vault_bump) = Pubkey::find_program_address(
        &[b"vault"],
        program_id,
    );

    if expected_vault != *vault.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Transfer SOL from user to vault
    invoke_signed(
        &system_instruction::transfer(user.key, vault.key, amount),
        &[user.clone(), vault.clone(), system_program.clone()],
        &[],
    )?;

    // Update shielded balance
    let mut account_data = ShieldedAccount::try_from_slice(&shielded_account.data.borrow())?;
    account_data.sol_balance = account_data.sol_balance.checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    account_data.serialize(&mut &mut shielded_account.data.borrow_mut()[..])?;

    msg!("Shielded {} lamports. New balance: {}", amount, account_data.sol_balance);
    Ok(())
}

fn process_unshield_sol(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let user = next_account_info(account_iter)?;
    let shielded_account = next_account_info(account_iter)?;
    let vault = next_account_info(account_iter)?;
    let _system_program = next_account_info(account_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if amount == 0 {
        msg!("Amount must be greater than 0");
        return Err(ProgramError::InvalidArgument);
    }

    // Verify and update shielded account
    let mut account_data = ShieldedAccount::try_from_slice(&shielded_account.data.borrow())?;

    if account_data.owner != *user.key {
        msg!("Unauthorized");
        return Err(ProgramError::IllegalOwner);
    }

    if account_data.sol_balance < amount {
        msg!("Insufficient shielded balance");
        return Err(ProgramError::InsufficientFunds);
    }

    // Verify vault PDA
    let (expected_vault, vault_bump) = Pubkey::find_program_address(
        &[b"vault"],
        program_id,
    );

    if expected_vault != *vault.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Update balance first
    account_data.sol_balance = account_data.sol_balance.checked_sub(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    account_data.serialize(&mut &mut shielded_account.data.borrow_mut()[..])?;

    // Transfer SOL from vault to user
    **vault.try_borrow_mut_lamports()? -= amount;
    **user.try_borrow_mut_lamports()? += amount;

    msg!("Unshielded {} lamports. New balance: {}", amount, account_data.sol_balance);
    Ok(())
}

fn process_get_balance(accounts: &[AccountInfo]) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let shielded_account = next_account_info(account_iter)?;

    let account_data = ShieldedAccount::try_from_slice(&shielded_account.data.borrow())?;

    msg!("SOL Balance: {} lamports", account_data.sol_balance);
    msg!("USDC Balance: {}", account_data.usdc_balance);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shielded_account_size() {
        assert_eq!(ShieldedAccount::SIZE, 50);
    }
}
