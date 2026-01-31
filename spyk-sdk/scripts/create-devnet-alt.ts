/**
 * Create Address Lookup Table for Privacy Cash on Devnet
 *
 * This script creates the ALT needed for Privacy Cash transactions.
 * Run once, then set NEXT_PUBLIC_ALT_ADDRESS to the output address.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  AddressLookupTableProgram,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Privacy Cash Program ID (same on devnet and mainnet)
const PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

// Fee recipient
const FEE_RECIPIENT = new PublicKey('AWexibGxNFKTa1b5R5MN4PJr9HWnWRwf8EW9g8cLx3dM');

// Native SOL mint (wrapped SOL)
const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Devnet USDC (Circle's devnet USDC)
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Compute budget program
const COMPUTE_BUDGET_PROGRAM = new PublicKey('ComputeBudget111111111111111111111111111111');

// SPL Token program
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Associated Token program
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

async function main() {
  console.log('Creating Address Lookup Table for Privacy Cash on Devnet...\n');

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME!, '.config/solana/id.json');

  if (!fs.existsSync(walletPath)) {
    console.error(`Wallet not found at ${walletPath}`);
    console.error('Set WALLET_PATH environment variable or use default Solana CLI wallet');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log(`Using wallet: ${payer.publicKey.toBase58()}`);

  // Connect to devnet
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`Connected to: ${rpcUrl}\n`);

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Wallet balance: ${balance / 1e9} SOL`);

  if (balance < 0.1 * 1e9) {
    console.error('\nInsufficient balance. Need at least 0.1 SOL for ALT creation.');
    console.error('Get devnet SOL from: https://faucet.solana.com/');
    process.exit(1);
  }

  // Get recent slot for ALT creation
  const slot = await connection.getSlot();
  console.log(`Current slot: ${slot}\n`);

  // Create ALT instruction
  const [createInstruction, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
    authority: payer.publicKey,
    payer: payer.publicKey,
    recentSlot: slot - 1, // Use a recent slot
  });

  console.log(`Creating ALT at: ${lookupTableAddress.toBase58()}\n`);

  // Addresses to add to ALT (these are used in Privacy Cash transactions)
  const addressesToAdd = [
    PROGRAM_ID,
    FEE_RECIPIENT,
    NATIVE_SOL_MINT,
    DEVNET_USDC_MINT,
    SystemProgram.programId,
    TOKEN_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
    COMPUTE_BUDGET_PROGRAM,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
  ];

  console.log('Addresses to add:');
  addressesToAdd.forEach((addr, i) => {
    console.log(`  ${i + 1}. ${addr.toBase58()}`);
  });
  console.log();

  // Extend ALT instruction
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    authority: payer.publicKey,
    lookupTable: lookupTableAddress,
    addresses: addressesToAdd,
  });

  // Build and send transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: [createInstruction, extendInstruction],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);

  console.log('Sending transaction...');

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
  });

  console.log(`Transaction sent: ${signature}`);
  console.log(`View on Solscan: https://solscan.io/tx/${signature}?cluster=devnet\n`);

  // Wait for confirmation
  console.log('Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    console.error('Transaction failed:', confirmation.value.err);
    process.exit(1);
  }

  console.log('\n✅ ALT created successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`ALT Address: ${lookupTableAddress.toBase58()}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Add this to your .env file:');
  console.log(`NEXT_PUBLIC_ALT_ADDRESS=${lookupTableAddress.toBase58()}\n`);

  // Verify ALT was created
  console.log('Verifying ALT...');

  // Wait a bit for the ALT to be available
  await new Promise(resolve => setTimeout(resolve, 2000));

  const altAccount = await connection.getAddressLookupTable(lookupTableAddress);

  if (altAccount.value) {
    console.log(`✅ ALT verified with ${altAccount.value.state.addresses.length} addresses`);
  } else {
    console.log('⚠️  ALT not yet available (may need a few more seconds)');
  }
}

main().catch(console.error);
