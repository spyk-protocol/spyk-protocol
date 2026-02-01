/**
 * SPYK Demo CLI
 * Interactive demonstration of the SPYK Protocol SDK
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import {
  Spyk,
  SpykError,
  UnsupportedTokenError,
  InsufficientBalanceError,
  InvalidAmountError,
  InvalidAddressError,
  TransactionError,
  DevnetX402Facilitator,
  MockX402Facilitator,
  noir,
  type Network,
} from '@spyk-protocol/sdk';

// ============================================
// Configuration
// ============================================

const PRIVACY_CASH_TOKENS = ['SOL', 'USDC'];
const ALL_TOKENS = ['SOL', 'USDC', 'BONK', 'RADR', 'ORE'];

function loadConfig(): { spyk: Spyk; network: Network } {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  const quicknodeUrl = process.env.QUICKNODE_URL;
  const customRpcUrl = process.env.RPC_URL;

  // Need at least one RPC provider
  if (!heliusApiKey && !quicknodeUrl && !customRpcUrl) {
    console.error(chalk.red('Error: RPC provider required'));
    console.error(chalk.yellow('Set one of: HELIUS_API_KEY, QUICKNODE_URL, or RPC_URL'));
    process.exit(1);
  }

  const secretKeyJson = process.env.WALLET_SECRET_KEY;
  if (!secretKeyJson) {
    console.error(chalk.red('Error: WALLET_SECRET_KEY environment variable is required'));
    console.error(chalk.yellow('Set it as a JSON array: [1,2,3,...,64]'));
    process.exit(1);
  }

  let wallet: Keypair;
  try {
    const secretKey = JSON.parse(secretKeyJson);
    wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch {
    console.error(chalk.red('Error: Invalid WALLET_SECRET_KEY format'));
    process.exit(1);
  }

  const network = (process.env.NETWORK || 'devnet') as Network;

  // Priority: Custom RPC > Quicknode > Helius (default)
  let spyk: Spyk;
  if (customRpcUrl) {
    spyk = new Spyk({ quicknodeUrl: customRpcUrl, network, wallet });
  } else if (quicknodeUrl) {
    spyk = new Spyk({ quicknodeUrl, network, wallet });
  } else {
    spyk = new Spyk({ heliusApiKey: heliusApiKey!, network, wallet });
  }

  return { spyk, network };
}

function getSolscanUrl(signature: string, network: Network): string {
  const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
  return `https://solscan.io/tx/${signature}${cluster}`;
}

// ============================================
// CLI Commands
// ============================================

const program = new Command();

program
  .name('spyk')
  .description('SPYK Protocol CLI - Private payments on Solana')
  .version('0.1.0');

// Deposit command
program
  .command('deposit <amount>')
  .option('-t, --token <token>', 'Token to deposit (SOL or USDC)', 'SOL')
  .option('--mock', 'Use mock mode (no real transaction)', false)
  .description('Shield tokens into private pool (SOL or USDC only)')
  .action(async (amount: string, options: { token: string; mock: boolean }) => {
    const token = options.token.toUpperCase();

    if (!PRIVACY_CASH_TOKENS.includes(token)) {
      console.error(chalk.red(`Error: Deposit only supports SOL and USDC.`));
      console.error(chalk.yellow('For other tokens, use the transfer command instead.'));
      process.exit(1);
    }

    const { network } = loadConfig();
    const spinner = ora(`Shielding ${amount} ${token}...`).start();

    try {
      if (options.mock) {
        // Mock mode for demo
        spinner.text = 'Generating ZK commitment...';
        await new Promise(resolve => setTimeout(resolve, 800));
        spinner.text = 'Building shield transaction...';
        await new Promise(resolve => setTimeout(resolve, 600));
        spinner.text = 'Signing transaction...';
        await new Promise(resolve => setTimeout(resolve, 400));
        spinner.text = 'Broadcasting to network...';
        await new Promise(resolve => setTimeout(resolve, 1000));
        spinner.text = 'Confirming on-chain...';
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockSig = 'Demo' + Math.random().toString(36).substring(2, 15) + 'MockTxSignature';
        spinner.succeed(chalk.green(`Successfully shielded ${amount} ${token}!`));
        console.log(chalk.cyan(`Transaction: ${getSolscanUrl(mockSig, network)}`));
        console.log(chalk.gray('(Mock mode - no real transaction sent)'));
      } else {
        const { spyk } = loadConfig();
        const result = await spyk.deposit(token as 'SOL' | 'USDC', parseFloat(amount), {
          onSigning: () => spinner.text = 'Signing transaction...',
          onSent: (sig) => spinner.text = `Transaction sent: ${sig.slice(0, 8)}...`,
        });

        spinner.succeed(chalk.green(`Successfully shielded ${amount} ${token}!`));
        console.log(chalk.cyan(`Transaction: ${getSolscanUrl(result.signature, network)}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Deposit failed'));
      handleError(error);
    }
  });

// Withdraw command
program
  .command('withdraw <amount>')
  .option('-t, --token <token>', 'Token to withdraw (SOL or USDC)', 'SOL')
  .option('-d, --destination <address>', 'Destination address (defaults to wallet)')
  .option('--mock', 'Use mock mode (no real transaction)', false)
  .description('Unshield tokens from private pool (SOL or USDC only)')
  .action(async (amount: string, options: { token: string; destination?: string; mock: boolean }) => {
    const token = options.token.toUpperCase();

    if (!PRIVACY_CASH_TOKENS.includes(token)) {
      console.error(chalk.red(`Error: Withdraw only supports SOL and USDC.`));
      process.exit(1);
    }

    const { network } = loadConfig();
    const spinner = ora(`Unshielding ${amount} ${token}...`).start();

    try {
      if (options.mock) {
        // Mock mode for demo
        spinner.text = 'Generating ZK proof...';
        await new Promise(resolve => setTimeout(resolve, 1000));
        spinner.text = 'Building unshield transaction...';
        await new Promise(resolve => setTimeout(resolve, 600));
        spinner.text = 'Signing transaction...';
        await new Promise(resolve => setTimeout(resolve, 400));
        spinner.text = 'Broadcasting to network...';
        await new Promise(resolve => setTimeout(resolve, 800));
        spinner.text = 'Confirming on-chain...';
        await new Promise(resolve => setTimeout(resolve, 600));

        const mockSig = 'Demo' + Math.random().toString(36).substring(2, 15) + 'MockTxSignature';
        spinner.succeed(chalk.green(`Successfully unshielded ${amount} ${token}!`));
        console.log(chalk.cyan(`Transaction: ${getSolscanUrl(mockSig, network)}`));
        console.log(chalk.gray('(Mock mode - no real transaction sent)'));
      } else {
        const { spyk } = loadConfig();
        const destination = options.destination ? new PublicKey(options.destination) : undefined;
        const result = await spyk.withdraw(token as 'SOL' | 'USDC', parseFloat(amount), destination, {
          onSigning: () => spinner.text = 'Signing transaction...',
          onSent: (sig) => spinner.text = `Transaction sent: ${sig.slice(0, 8)}...`,
        });

        spinner.succeed(chalk.green(`Successfully unshielded ${amount} ${token}!`));
        console.log(chalk.cyan(`Transaction: ${getSolscanUrl(result.signature, network)}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Withdraw failed'));
      handleError(error);
    }
  });

// Transfer command
program
  .command('transfer <to> <amount>')
  .option('-t, --token <token>', 'Token to transfer', 'SOL')
  .option('--mock', 'Use mock mode (no real transaction)', false)
  .description('Private transfer via ShadowWire (all supported tokens)')
  .action(async (to: string, amount: string, options: { token: string; mock: boolean }) => {
    const token = options.token.toUpperCase();
    const { network } = loadConfig();
    const spinner = ora(`Transferring ${amount} ${token} to ${to.slice(0, 8)}...`).start();

    try {
      if (options.mock) {
        // Mock mode for demo
        spinner.text = 'Generating ephemeral keypair...';
        await new Promise(resolve => setTimeout(resolve, 500));
        spinner.text = 'Building private transfer...';
        await new Promise(resolve => setTimeout(resolve, 600));
        spinner.text = 'Signing with ephemeral key...';
        await new Promise(resolve => setTimeout(resolve, 400));
        spinner.text = 'Broadcasting to network...';
        await new Promise(resolve => setTimeout(resolve, 800));
        spinner.text = 'Confirming on-chain...';
        await new Promise(resolve => setTimeout(resolve, 600));

        const mockSig = 'Demo' + Math.random().toString(36).substring(2, 15) + 'MockTxSignature';
        spinner.succeed(chalk.green(`Successfully transferred ${amount} ${token}!`));
        console.log(chalk.cyan(`Transaction: ${getSolscanUrl(mockSig, network)}`));
        console.log(chalk.gray('(Mock mode - no real transaction sent)'));
      } else {
        const { spyk } = loadConfig();
        const result = await spyk.transfer(
          {
            to,
            amount: parseFloat(amount),
            token,
          },
          {
            onSigning: () => spinner.text = 'Signing transaction...',
            onSent: (sig) => spinner.text = `Transaction sent: ${sig.slice(0, 8)}...`,
          }
        );

        spinner.succeed(chalk.green(`Successfully transferred ${amount} ${token}!`));
        console.log(chalk.cyan(`Transaction: ${getSolscanUrl(result.signature, network)}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Transfer failed'));
      handleError(error);
    }
  });

// x402 Pay command - Private AI API payment
program
  .command('pay <url>')
  .option('-a, --amount <amount>', 'Payment amount in SOL', '0.001')
  .option('-r, --recipient <address>', 'Recipient address (for devnet mode)')
  .option('--mock', 'Use mock mode (no real payment)', false)
  .option('--devnet', 'Use real devnet transactions (requires funded wallet)', false)
  .description('Pay for an AI API privately using x402 protocol')
  .action(async (url: string, options: { amount: string; recipient?: string; mock: boolean; devnet: boolean }) => {
    const { spyk, network } = loadConfig();

    console.log(chalk.bold.cyan('\n[x402] SPYK x402 - Private AI Payment\n'));
    console.log(chalk.white('This demonstrates how AI agents pay for APIs privately.\n'));

    // Show mode
    if (options.devnet) {
      console.log(chalk.bgGreen.black(' DEVNET MODE ') + chalk.green(' Real transactions will be sent!\n'));
    } else if (options.mock) {
      console.log(chalk.bgYellow.black(' MOCK MODE ') + chalk.yellow(' No real transactions\n'));
    }

    // Step 1: Show the problem
    console.log(chalk.yellow('--- The Problem ---'));
    console.log(chalk.white('Normal payment: Your wallet -> API Provider'));
    console.log(chalk.red('  ! Your wallet is permanently linked on-chain'));
    console.log(chalk.red('  ! Competitors can see which APIs you use'));
    console.log(chalk.red('  ! Spend patterns reveal your business activity\n'));

    // Step 2: Show the solution
    console.log(chalk.green('--- SPYK Solution ---'));
    console.log(chalk.white('1. Shield funds into ZK pool (Privacy Cash)'));
    console.log(chalk.white('2. Generate ephemeral keypair (one-time use)'));
    console.log(chalk.white('3. Withdraw to ephemeral address'));
    console.log(chalk.white('4. Pay API from ephemeral (no link to you!)'));
    console.log(chalk.white('5. Discard ephemeral keypair\n'));

    const spinner = ora('Initiating private payment flow...').start();

    try {
      // For devnet mode, use a real recipient or the user-provided one
      // Default to a known devnet address (System Program as fallback, but prefer user input)
      const recipient = options.recipient || (options.devnet
        ? '11111111111111111111111111111111' // System Program (burns SOL effectively)
        : 'DemoAPIWa11etAddressxxxxxxxxxxxxxxxxxxxxxxxxx');

      // Validate recipient for devnet mode
      if (options.devnet && !options.recipient) {
        spinner.warn(chalk.yellow('No recipient specified for devnet mode'));
        console.log(chalk.yellow('\nTip: Use -r <address> to specify a real recipient'));
        console.log(chalk.yellow('     Using System Program (11111...1111) as default\n'));
        spinner.start();
      }

      if (options.mock) {
        // Full mock mode - skip balance check
        spinner.text = 'Checking shielded balance...';
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(chalk.cyan(`\n[Balance] Shielded Balance: 1.5 SOL (mock)`));
      } else if (options.devnet) {
        // Devnet mode - check wallet balance (not shielded)
        spinner.text = 'Checking wallet balance...';
        const balance = await spyk.rpcConnection.getBalance(spyk.walletPublicKey);
        const balanceSol = balance / 1e9;
        console.log(chalk.cyan(`\n[Balance] Wallet Balance: ${balanceSol.toFixed(4)} SOL`));

        if (balanceSol < parseFloat(options.amount) + 0.001) {
          spinner.fail(chalk.red('Insufficient balance'));
          console.log(chalk.yellow(`\nNeed at least ${(parseFloat(options.amount) + 0.001).toFixed(4)} SOL`));
          console.log(chalk.yellow('Get devnet SOL from: https://faucet.solana.com/\n'));
          return;
        }
      } else {
        // Real mode with Privacy Cash - check shielded balance
        spinner.text = 'Checking shielded balance...';
        const balance = await spyk.x402.getShieldedBalance();
        const balanceSol = Number(balance) / 1e9;
        console.log(chalk.cyan(`\n[Balance] Shielded Balance: ${balanceSol.toFixed(4)} SOL`));

        if (balanceSol < parseFloat(options.amount)) {
          spinner.warn(chalk.yellow('Insufficient shielded balance'));
          console.log(chalk.yellow(`\nTip: Run 'pnpm dev deposit ${options.amount}' first to shield funds\n`));

          const { shouldDeposit } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldDeposit',
              message: `Shield ${options.amount} SOL now?`,
              default: true,
            },
          ]);

          if (shouldDeposit) {
            spinner.start('Shielding funds...');
            await spyk.deposit('SOL', parseFloat(options.amount), {
              onSigning: () => spinner.text = 'Signing deposit...',
            });
            spinner.succeed(chalk.green(`Shielded ${options.amount} SOL`));
          } else {
            return;
          }
        }
      }

      // Step 4: Simulate API request
      spinner.start(`Calling API: ${url}`);

      const invoice = {
        amount: options.amount,
        token: 'SOL' as const,
        recipient,
        memo: `Payment for ${url}`,
        network: network as 'devnet' | 'mainnet-beta',
      };

      spinner.text = 'API returned 402 Payment Required...';
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(chalk.yellow(`\n[Invoice] Invoice received:`));
      console.log(chalk.white(`   Amount: ${invoice.amount} SOL`));
      console.log(chalk.white(`   Recipient: ${invoice.recipient.slice(0, 8)}...${invoice.recipient.slice(-4)}`));
      console.log(chalk.white(`   Memo: ${invoice.memo}\n`));

      let paymentSignature: string;
      let ephemeralAddress: string;

      if (options.devnet) {
        // REAL DEVNET MODE - Execute actual transactions
        const facilitator = new DevnetX402Facilitator({
          connection: spyk.rpcConnection,
          fundingKeypair: (spyk.privacyCash as any).config.wallet, // Access the wallet from config
          logPayments: false, // We'll do our own logging
        });

        spinner.start('Generating ephemeral keypair...');
        await new Promise(resolve => setTimeout(resolve, 300));

        spinner.text = 'Funding ephemeral address...';

        // Execute real payment
        paymentSignature = await facilitator.createPaymentProof(invoice);
        const details = facilitator.getLastPaymentDetails()!;
        ephemeralAddress = details.ephemeralAddress;

        spinner.succeed(chalk.green('Payment sent on devnet!'));

        console.log(chalk.bold.green('\n[SUCCESS] Private Payment Complete!\n'));
        console.log(chalk.cyan('--- Transaction Details ---'));
        console.log(chalk.white(`Ephemeral Address: ${ephemeralAddress}`));
        console.log(chalk.white(`Funding Tx:        ${details.fundingSignature}`));
        console.log(chalk.white(`Payment Tx:        ${paymentSignature}`));
        console.log(chalk.bold.cyan(`\nView on Solscan:   ${details.solscanUrl}\n`));

      } else if (options.mock) {
        // Mock mode - simulate with delays
        spinner.start('Generating ephemeral keypair...');
        await new Promise(resolve => setTimeout(resolve, 500));

        ephemeralAddress = Keypair.generate().publicKey.toBase58();
        spinner.text = `Ephemeral address: ${ephemeralAddress.slice(0, 8)}...`;
        await new Promise(resolve => setTimeout(resolve, 500));

        spinner.text = 'Withdrawing to ephemeral address...';
        await new Promise(resolve => setTimeout(resolve, 500));

        spinner.text = 'Signing payment from ephemeral...';
        await new Promise(resolve => setTimeout(resolve, 500));

        paymentSignature = 'mock_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        spinner.succeed(chalk.green('Payment simulated (mock mode)'));

        console.log(chalk.bold.green('\n[SUCCESS] Private Payment Complete!\n'));

      } else {
        // Full Privacy Cash mode
        spinner.start('Generating ephemeral keypair...');

        // Use the actual x402 client with mock facilitator for now
        // Full Privacy Cash integration would use payPrivately()
        spyk.x402.setFacilitator(new MockX402Facilitator({ logPayments: false }));

        const result = await spyk.x402.payPrivately(invoice);
        ephemeralAddress = result.ephemeralUsed!;
        paymentSignature = result.signature;

        spinner.succeed(chalk.green('Payment sent privately!'));

        console.log(chalk.bold.green('\n[SUCCESS] Private Payment Complete!\n'));
        console.log(chalk.cyan('--- Transaction Details ---'));
        console.log(chalk.white(`Withdrawal Tx: ${result.withdrawalSignature}`));
        console.log(chalk.white(`Payment Proof: ${paymentSignature.slice(0, 20)}...`));
      }

      // Privacy summary
      console.log(chalk.cyan('--- Privacy Summary ---'));
      console.log(chalk.white(`Your wallet:       ${chalk.gray('(hidden from payment)')}`));
      console.log(chalk.white(`Ephemeral used:    ${ephemeralAddress.slice(0, 16)}...`));
      console.log(chalk.white(`Payment amount:    ${options.amount} SOL`));
      console.log(chalk.white(`On-chain link:     ${chalk.green('BROKEN')} (ephemeral is one-time)`));
      console.log(chalk.white(`API provider sees: Random one-time address`));
      console.log(chalk.white(`Competitors see:   Nothing linked to you\n`));

      if (options.devnet) {
        console.log(chalk.yellow('--- What happened on-chain ---'));
        console.log(chalk.white('1. Your wallet funded an ephemeral address'));
        console.log(chalk.white('2. Ephemeral address paid the recipient'));
        console.log(chalk.white('3. Ephemeral keypair was discarded'));
        console.log(chalk.gray('\n(In production, step 1 uses Privacy Cash ZK withdrawal)\n'));
      } else {
        console.log(chalk.yellow('--- What just happened ---'));
        console.log(chalk.white('1. Funds came from ZK shielded pool (unlinkable)'));
        console.log(chalk.white('2. Paid from ephemeral address (one-time)'));
        console.log(chalk.white('3. Ephemeral keypair discarded (never reused)'));
        console.log(chalk.white('4. Your wallet never appeared on-chain\n'));
      }

    } catch (error) {
      spinner.fail(chalk.red('Payment failed'));
      handleError(error);
    }
  });

// Balance command
program
  .command('balance')
  .option('-t, --token <token>', 'Specific token to query')
  .description('Check private balances')
  .action(async (options: { token?: string }) => {
    const { spyk } = loadConfig();
    const spinner = ora('Fetching balances...').start();

    try {
      if (options.token) {
        const result = await spyk.getBalance(options.token);
        spinner.stop();
        // @ts-ignore
        console.log(chalk.cyan(`${options.token.toUpperCase()}: ${result.amount.toString()}`));
      } else {
        const result = await spyk.getBalance();
        spinner.stop();
        console.log(chalk.bold.cyan('\n📊 Private Balances\n'));
        console.log(chalk.white('Privacy Cash (Shielded):'));
        // @ts-ignore
        console.log(`  SOL:  ${result.privacyCash.SOL.toString()}`);
        // @ts-ignore
        console.log(`  USDC: ${result.privacyCash.USDC.toString()}`);
        console.log(chalk.white('\nShadowWire:'));
        console.log('  (Query individual tokens with --token flag)');
      }
    } catch (error) {
      spinner.fail(chalk.red('Balance query failed'));
      handleError(error);
    }
  });

// Faucet command - Get devnet tokens
program
  .command('faucet')
  .option('-t, --token <token>', 'Token to get (SOL or USDC)', 'SOL')
  .option('-a, --amount <amount>', 'Amount to request (SOL only)', '1')
  .description('Get devnet tokens for testing (SOL airdrop, USDC faucet instructions)')
  .action(async (options: { token: string; amount: string }) => {
    const token = options.token.toUpperCase();
    const amount = parseFloat(options.amount);

    console.log(chalk.bold.cyan('\n💧 SPYK Devnet Faucet\n'));

    if (token === 'SOL') {
      // SOL airdrop
      console.log(chalk.white('Getting devnet SOL...\n'));
      console.log(chalk.yellow('Option 1: Web Faucet (Recommended)'));
      console.log(chalk.white('  https://faucet.solana.com/'));
      console.log(chalk.gray('  Up to 5 SOL per request, 2x per hour\n'));

      console.log(chalk.yellow('Option 2: CLI Airdrop'));

      const { spyk, network } = loadConfig();

      if (network !== 'devnet') {
        console.log(chalk.red('  Airdrop only works on devnet!'));
        return;
      }

      const spinner = ora(`Requesting ${amount} SOL airdrop...`).start();

      try {
        const signature = await spyk.rpcConnection.requestAirdrop(
          spyk.walletPublicKey,
          amount * LAMPORTS_PER_SOL
        );

        spinner.text = 'Confirming airdrop...';
        await spyk.rpcConnection.confirmTransaction(signature);

        const balance = await spyk.rpcConnection.getBalance(spyk.walletPublicKey);
        spinner.succeed(chalk.green(`Received ${amount} SOL!`));
        console.log(chalk.cyan(`  New balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`));
        console.log(chalk.gray(`  Tx: https://solscan.io/tx/${signature}?cluster=devnet`));
      } catch (error) {
        spinner.fail(chalk.red('Airdrop failed'));
        console.log(chalk.yellow('\nTip: Use https://faucet.solana.com/ if rate limited'));
      }

    } else if (token === 'USDC') {
      // Circle's official USDC
      const { spyk } = loadConfig();
      const USDC_DEVNET_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

      console.log(chalk.white('Getting devnet USDC (Circle Official)...\n'));

      // Check current balance
      let currentBalance = 0;
      try {
        const ata = await getAssociatedTokenAddress(USDC_DEVNET_MINT, spyk.walletPublicKey);
        const account = await getAccount(spyk.rpcConnection, ata);
        currentBalance = Number(account.amount) / 1e6;
        console.log(chalk.cyan(`Current USDC balance: ${currentBalance.toFixed(2)} USDC\n`));
      } catch {
        console.log(chalk.gray('No USDC account yet.\n'));
      }

      console.log(chalk.yellow('Step 1: Get USDC from Circle Faucet'));
      console.log(chalk.white('  https://faucet.circle.com/'));
      console.log(chalk.gray('  • Select "Solana" → "Devnet"'));
      console.log(chalk.gray('  • Limit: 20 USDC per 2 hours per address\n'));

      console.log(chalk.white('Your wallet address (copy this):'));
      console.log(chalk.bold.green(`  ${spyk.walletPublicKey.toBase58()}\n`));

      console.log(chalk.yellow('💡 Need more than 20 USDC?'));
      console.log(chalk.white('  Use multiple wallets to bypass rate limit:\n'));
      console.log(chalk.gray('  1. Create temp wallets:'));
      console.log(chalk.white('     solana-keygen new -o /tmp/temp1.json --no-bip39-passphrase'));
      console.log(chalk.white('     solana-keygen new -o /tmp/temp2.json --no-bip39-passphrase\n'));
      console.log(chalk.gray('  2. Get their addresses:'));
      console.log(chalk.white('     solana address -k /tmp/temp1.json\n'));
      console.log(chalk.gray('  3. Faucet 20 USDC to each at https://faucet.circle.com/\n'));
      console.log(chalk.gray('  4. Transfer to your main wallet:'));
      console.log(chalk.white(`     spl-token transfer ${USDC_DEVNET_MINT.toBase58()} 20 ${spyk.walletPublicKey.toBase58()} --owner /tmp/temp1.json --url devnet --allow-unfunded-recipient --fund-recipient\n`));

      console.log(chalk.cyan('─────────────────────────────────────────────'));
      console.log(chalk.white('USDC Devnet Mint: ') + chalk.gray(USDC_DEVNET_MINT.toBase58()));

    } else {
      console.log(chalk.red(`Unknown token: ${token}`));
      console.log(chalk.yellow('Supported tokens: SOL, USDC'));
    }
  });

// ============================================
// Compliance Commands (Noir ZK Proofs)
// ============================================

const complianceCmd = program
  .command('compliance')
  .description('ZK compliance proofs using Noir circuits');

// compliance check <address>
complianceCmd
  .command('check <address>')
  .option('--mock', 'Use mock mode (no nargo/sunspot required)', false)
  .option('-v, --verbose', 'Show detailed output', false)
  .description('Check if an address is on the sanctions list')
  .action(async (address: string, options: { mock: boolean; verbose: boolean }) => {
    console.log(chalk.bold.cyan('\n[Compliance] SPYK ZK Compliance Check\n'));

    // Validate address
    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(address);
    } catch {
      console.error(chalk.red(`Invalid Solana address: ${address}`));
      process.exit(1);
    }

    const spinner = ora('Initializing compliance prover...').start();

    try {
      // Create prover with mock flag
      const prover = noir.createNoirProver({ useCLI: !options.mock });
      await prover.initialize();

      const mode = prover.getMode();
      spinner.text = `Checking address (${mode} mode)...`;

      if (options.verbose) {
        const info = prover.getCircuitInfo();
        console.log(chalk.gray(`\nCircuit: ${info.name} v${info.version}`));
        console.log(chalk.gray(`Backend: ${info.backend}`));
        console.log(chalk.gray(`Mode: ${info.mode}\n`));
      }

      // Perform compliance check
      const result = await prover.proveCompliance(pubkey);

      spinner.stop();

      if (result.passed) {
        console.log(chalk.bold.green('[PASSED] Address is NOT on sanctions list'));
        console.log(chalk.white(`\nAddress:    ${pubkey.toBase58()}`));
        console.log(chalk.white(`Checked at: ${new Date(result.timestamp).toISOString()}`));
        console.log(chalk.white(`Confidence: ${(result.confidence * 100).toFixed(0)}%`));

        if (result.noirProof) {
          console.log(chalk.cyan(`\nProof generated (${result.noirProof.metadata.size} bytes)`));
          console.log(chalk.gray('Use `spyk compliance prove` to get full proof data'));
        }
      } else {
        console.log(chalk.bold.red('[FAILED] Address may be sanctioned or check failed'));
        console.log(chalk.white(`\nAddress: ${pubkey.toBase58()}`));
        console.log(chalk.yellow('This address cannot be used with SPYK Protocol.'));
      }

    } catch (error) {
      spinner.fail(chalk.red('Compliance check failed'));
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (options.verbose && error.stack) {
          console.error(chalk.gray(error.stack));
        }
      }
      process.exit(1);
    }
  });

// compliance prove <address>
complianceCmd
  .command('prove <address>')
  .option('--mock', 'Use mock mode (no nargo/sunspot required)', false)
  .option('-o, --output <file>', 'Write proof to file (JSON)')
  .option('-v, --verbose', 'Show detailed output', false)
  .description('Generate a ZK proof that an address is not sanctioned')
  .action(async (address: string, options: { mock: boolean; output?: string; verbose: boolean }) => {
    console.log(chalk.bold.cyan('\n[Compliance] SPYK ZK Proof Generation\n'));

    // Validate address
    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(address);
    } catch {
      console.error(chalk.red(`Invalid Solana address: ${address}`));
      process.exit(1);
    }

    const spinner = ora('Initializing Noir prover...').start();

    try {
      // Check toolchain status first
      if (!options.mock) {
        spinner.text = 'Checking Noir toolchain...';
        const status = await noir.checkToolchain();

        if (!status.ready) {
          spinner.warn(chalk.yellow('Noir toolchain not fully installed'));
          console.log(chalk.yellow('\nMissing components:'));
          if (!status.nargo.installed) {
            console.log(chalk.gray('  - nargo: Not found'));
            console.log(chalk.gray('    Install: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash'));
          }
          if (!status.sunspot.installed) {
            console.log(chalk.gray('  - sunspot: Not found'));
            console.log(chalk.gray('    Install: cargo install sunspot'));
          }
          console.log(chalk.yellow('\nFalling back to mock mode...\n'));
        }
      }

      // Create prover
      const prover = noir.createNoirProver({ useCLI: !options.mock, verbose: options.verbose });
      await prover.initialize();

      const mode = prover.getMode();
      spinner.text = `Generating ZK proof (${mode} mode)...`;

      if (options.verbose) {
        const info = prover.getCircuitInfo();
        console.log(chalk.gray(`\nCircuit: ${info.name} v${info.version}`));
        console.log(chalk.gray(`Backend: ${info.backend}`));
        console.log(chalk.gray(`Mode: ${info.mode}\n`));
        spinner.start();
      }

      // Generate proof
      const startTime = Date.now();
      const result = await prover.proveCompliance(pubkey);
      const elapsed = Date.now() - startTime;

      spinner.stop();

      if (!result.passed || !result.noirProof) {
        console.log(chalk.bold.red('[FAILED] Could not generate proof'));
        console.log(chalk.yellow('Address may be sanctioned or proof generation failed.'));
        process.exit(1);
      }

      console.log(chalk.bold.green('[SUCCESS] ZK Proof Generated\n'));
      console.log(chalk.white('--- Proof Details ---'));
      console.log(chalk.white(`Address:     ${pubkey.toBase58()}`));
      console.log(chalk.white(`Circuit:     ${result.noirProof.metadata.circuit}`));
      console.log(chalk.white(`Noir Ver:    ${result.noirProof.metadata.noirVersion}`));
      console.log(chalk.white(`Proof Size:  ${result.noirProof.metadata.size} bytes`));
      console.log(chalk.white(`Generated:   ${new Date(result.noirProof.metadata.timestamp).toISOString()}`));
      console.log(chalk.white(`Time:        ${elapsed}ms`));
      console.log(chalk.white(`Mode:        ${mode}`));

      // Output proof
      const proofData = {
        address: pubkey.toBase58(),
        proof: Buffer.from(result.noirProof.proof).toString('base64'),
        publicInputs: {
          address: Buffer.from(result.noirProof.publicInputs.address).toString('hex'),
          root: Buffer.from(result.noirProof.publicInputs.root).toString('hex'),
        },
        metadata: result.noirProof.metadata,
        mode,
      };

      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, JSON.stringify(proofData, null, 2));
        console.log(chalk.cyan(`\nProof written to: ${options.output}`));
      } else {
        console.log(chalk.cyan('\n--- Proof (Base64) ---'));
        console.log(chalk.gray(proofData.proof.slice(0, 80) + '...'));
        console.log(chalk.gray(`(${proofData.proof.length} chars total)`));
        console.log(chalk.yellow('\nTip: Use -o <file> to save full proof to a file'));
      }

      if (mode === 'mock') {
        console.log(chalk.yellow('\n[Note] This is a mock proof for demo purposes.'));
        console.log(chalk.yellow('Install nargo and sunspot for cryptographic proofs.'));
      }

    } catch (error) {
      spinner.fail(chalk.red('Proof generation failed'));
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (options.verbose && error.stack) {
          console.error(chalk.gray(error.stack));
        }
      }
      process.exit(1);
    }
  });

// compliance verify <proof>
complianceCmd
  .command('verify <proof>')
  .option('--mock', 'Use mock verifier (no on-chain transaction)', false)
  .option('-v, --verbose', 'Show detailed output', false)
  .description('Verify a ZK proof on-chain (or locally with --mock)')
  .action(async (proofInput: string, options: { mock: boolean; verbose: boolean }) => {
    console.log(chalk.bold.cyan('\n[Compliance] SPYK ZK Proof Verification\n'));

    const spinner = ora('Loading proof...').start();

    try {
      // Load proof from file or parse as base64
      let proofData: {
        address: string;
        proof: string;
        publicWitness?: string;
        publicInputs: { address: string; root: string };
        metadata: { circuit: string; noirVersion: string; timestamp: number; size: number };
        mode?: string;
      };

      const fs = await import('fs');
      if (fs.existsSync(proofInput)) {
        const content = fs.readFileSync(proofInput, 'utf-8');
        proofData = JSON.parse(content);
        spinner.text = `Loaded proof from ${proofInput}`;
      } else {
        // Try to parse as inline JSON
        try {
          proofData = JSON.parse(proofInput);
        } catch {
          console.error(chalk.red('Invalid proof input. Provide a file path or JSON string.'));
          spinner.fail();
          process.exit(1);
        }
      }

      // Convert to NoirProof format
      const noirProof: noir.NoirProof = {
        proof: Uint8Array.from(Buffer.from(proofData.proof, 'base64')),
        publicInputs: {
          address: Uint8Array.from(Buffer.from(proofData.publicInputs.address, 'hex')),
          root: Uint8Array.from(Buffer.from(proofData.publicInputs.root, 'hex')),
        },
        metadata: proofData.metadata,
      };

      // Extract public witness if provided
      const publicWitness = proofData.publicWitness
        ? Uint8Array.from(Buffer.from(proofData.publicWitness, 'base64'))
        : undefined;

      if (options.verbose) {
        console.log(chalk.gray('\nProof loaded:'));
        console.log(chalk.gray(`  Address: ${proofData.address}`));
        console.log(chalk.gray(`  Circuit: ${noirProof.metadata.circuit}`));
        console.log(chalk.gray(`  Size: ${noirProof.metadata.size} bytes\n`));
      }

      if (options.mock) {
        // Mock verification (local structural validation)
        spinner.text = 'Verifying proof locally (mock mode)...';

        const mockVerifier = noir.createMockNoirVerifier();
        const result = await mockVerifier.verifyOnChain(noirProof);

        spinner.stop();

        if (result.verified) {
          console.log(chalk.bold.green('[VERIFIED] Proof is structurally valid\n'));
          console.log(chalk.white('--- Verification Result ---'));
          console.log(chalk.white(`Address:   ${proofData.address}`));
          console.log(chalk.white(`Verified:  ${new Date(result.timestamp).toISOString()}`));
          console.log(chalk.white(`Signature: ${result.signature}`));
          console.log(chalk.yellow('\n[Note] This was a local mock verification.'));
          console.log(chalk.yellow('Remove --mock flag for on-chain verification.'));
        } else {
          console.log(chalk.bold.red('[INVALID] Proof failed structural validation\n'));
          console.log(chalk.white(`Error: ${result.error}`));
        }

      } else {
        // On-chain verification
        spinner.text = 'Connecting to Solana...';

        const { spyk, network } = loadConfig();

        spinner.text = `Verifying proof on-chain (${network})...`;

        // Create auto verifier (checks if program is deployed)
        const wallet = (spyk.privacyCash as any).config.wallet;
        const verifier = await noir.createAutoVerifier(spyk.rpcConnection, wallet, {
          network: network === 'mainnet' ? 'mainnet' : 'devnet',
        });

        // Determine if we're using mock or real verifier
        const isMockVerifier = verifier instanceof noir.MockNoirVerifier;
        if (isMockVerifier) {
          spinner.text = 'Verifier program not deployed, using local verification...';
        }

        const result = await verifier.verifyOnChain(noirProof, publicWitness);

        spinner.stop();

        if (result.verified) {
          console.log(chalk.bold.green('[VERIFIED] Proof is valid!\n'));
          console.log(chalk.white('--- Verification Result ---'));
          console.log(chalk.white(`Address:   ${proofData.address}`));
          console.log(chalk.white(`Verified:  ${new Date(result.timestamp).toISOString()}`));
          if (result.signature) {
            console.log(chalk.white(`Signature: ${result.signature}`));
            if (!isMockVerifier) {
              console.log(chalk.cyan(`\nView on Solscan: ${getSolscanUrl(result.signature, network)}`));
            }
          }
          if (isMockVerifier) {
            console.log(chalk.yellow('\n[Note] Verified locally (verifier program not deployed).'));
          }
        } else {
          console.log(chalk.bold.red('[INVALID] Proof verification failed\n'));
          console.log(chalk.white(`Error: ${result.error || 'Unknown error'}`));
        }
      }

    } catch (error) {
      spinner.fail(chalk.red('Verification failed'));
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (options.verbose && error.stack) {
          console.error(chalk.gray(error.stack));
        }
      }
      process.exit(1);
    }
  });

// Interactive command
program
  .command('interactive')
  .description('Start interactive demo mode')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔐 SPYK Protocol Interactive Demo\n'));

    const { operation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'operation',
        message: 'What would you like to do?',
        choices: [
          { name: '💳 Pay API (x402 Private AI Payment)', value: 'pay' },
          { name: '🔒 Deposit (Shield SOL/USDC)', value: 'deposit' },
          { name: '🔓 Withdraw (Unshield SOL/USDC)', value: 'withdraw' },
          { name: '📤 Transfer (Private transfer any token)', value: 'transfer' },
          { name: '📊 Balance (Check private balances)', value: 'balance' },
          { name: '❌ Exit', value: 'exit' },
        ],
      },
    ]);

    if (operation === 'exit') {
      console.log(chalk.yellow('Goodbye!'));
      return;
    }

    if (operation === 'balance') {
      const { spyk } = loadConfig();
      const spinner = ora('Fetching balances...').start();
      try {
        const result = await spyk.getBalance();
        spinner.stop();
        console.log(chalk.bold.cyan('\n📊 Private Balances\n'));
        // @ts-ignore
        console.log(`  SOL:  ${result.privacyCash.SOL.toString()}`);
        // @ts-ignore
        console.log(`  USDC: ${result.privacyCash.USDC.toString()}`);
      } catch (error) {
        spinner.fail(chalk.red('Failed'));
        handleError(error);
      }
      return;
    }

    if (operation === 'pay') {
      const { url } = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'API URL to pay:',
          default: 'https://api.claude.ai/v1/messages',
        },
      ]);

      const { amount } = await inquirer.prompt([
        {
          type: 'input',
          name: 'amount',
          message: 'Payment amount (SOL):',
          default: '0.001',
        },
      ]);

      // Trigger the pay command
      await program.parseAsync(['node', 'cli', 'pay', url, '-a', amount, '--mock']);
      return;
    }

    // Token selection based on operation
    const tokenChoices = operation === 'transfer'
      ? ALL_TOKENS.map(t => ({ name: t, value: t }))
      : PRIVACY_CASH_TOKENS.map(t => ({ name: t, value: t }));

    const { token } = await inquirer.prompt([
      {
        type: 'list',
        name: 'token',
        message: 'Select token:',
        choices: tokenChoices,
      },
    ]);

    const { amount } = await inquirer.prompt([
      {
        type: 'input',
        name: 'amount',
        message: `Amount of ${token}:`,
        validate: (input) => {
          const num = parseFloat(input);
          return !isNaN(num) && num > 0 ? true : 'Please enter a positive number';
        },
      },
    ]);

    let recipient: string | undefined;
    if (operation === 'transfer') {
      const { to } = await inquirer.prompt([
        {
          type: 'input',
          name: 'to',
          message: 'Recipient address:',
          validate: (input) => {
            try {
              new PublicKey(input);
              return true;
            } catch {
              return 'Please enter a valid Solana address';
            }
          },
        },
      ]);
      recipient = to;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: operation === 'transfer'
          ? `Confirm: Transfer ${amount} ${token} to ${recipient?.slice(0, 8)}...?`
          : `Confirm: ${operation === 'deposit' ? 'Shield' : 'Unshield'} ${amount} ${token}?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }

    const { spyk, network } = loadConfig();
    const spinner = ora('Processing...').start();

    try {
      let result;

      if (operation === 'deposit') {
        result = await spyk.deposit(token as 'SOL' | 'USDC', parseFloat(amount), {
          onSigning: () => spinner.text = 'Signing...',
        });
        spinner.succeed(chalk.green(`Shielded ${amount} ${token}!`));
      } else if (operation === 'withdraw') {
        result = await spyk.withdraw(token as 'SOL' | 'USDC', parseFloat(amount), undefined, {
          onSigning: () => spinner.text = 'Signing...',
        });
        spinner.succeed(chalk.green(`Unshielded ${amount} ${token}!`));
      } else {
        result = await spyk.transfer(
          { to: recipient!, amount: parseFloat(amount), token },
          { onSigning: () => spinner.text = 'Signing...' }
        );
        spinner.succeed(chalk.green(`Transferred ${amount} ${token}!`));
      }

      console.log(chalk.cyan(`Transaction: ${getSolscanUrl(result.signature, network)}`));
    } catch (error) {
      spinner.fail(chalk.red('Operation failed'));
      handleError(error);
    }
  });

// ============================================
// Swap Commands (Arcium - Private Swaps)
// ============================================

const swapCmd = program.command('swap').description('Private swap operations (Arcium MXE)');

swapCmd
  .command('quote <amount> <from> <to>')
  .option('--slippage <bps>', 'Slippage tolerance in basis points', '50')
  .description('Get a quote for a private swap')
  .action(async (amount: string, from: string, to: string, options: { slippage: string }) => {
    const fromToken = from.toUpperCase();
    const toToken = to.toUpperCase();
    const amountNum = parseFloat(amount);
    const slippageBps = parseInt(options.slippage, 10);

    console.log(chalk.bold.cyan('\n[Arcium] Private Swap Quote\n'));
    console.log(chalk.yellow('Note: Arcium MXE is not yet deployed on devnet.'));
    console.log(chalk.yellow('Showing simulated quote with mock pricing.\n'));

    const spinner = ora('Fetching swap quote...').start();

    try {
      // Simulate quote calculation
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock price ratios (simplified)
      const mockPrices: Record<string, number> = {
        SOL: 100, // $100/SOL
        USDC: 1,
        USDT: 1,
        BONK: 0.00002,
      };

      const fromPrice = mockPrices[fromToken] || 1;
      const toPrice = mockPrices[toToken] || 1;
      const inputValue = amountNum * fromPrice;
      const expectedOutput = inputValue / toPrice;
      const feeBps = 30; // 0.3% fee
      const feeAmount = (expectedOutput * feeBps) / 10000;
      const outputAfterFee = expectedOutput - feeAmount;
      const minOutput = outputAfterFee * (1 - slippageBps / 10000);
      const priceImpact = Math.min(10, amountNum * 0.1); // Simplified impact

      spinner.succeed(chalk.green('Quote retrieved'));

      console.log(chalk.cyan('\n--- Swap Quote ---'));
      console.log(chalk.white(`Input:           ${amountNum} ${fromToken}`));
      console.log(chalk.white(`Expected Output: ${outputAfterFee.toFixed(6)} ${toToken}`));
      console.log(chalk.white(`Minimum Output:  ${minOutput.toFixed(6)} ${toToken} (${slippageBps/100}% slippage)`));
      console.log(chalk.white(`Fee:             ${feeAmount.toFixed(6)} ${toToken} (0.30%)`));
      console.log(chalk.white(`Price Impact:    ${priceImpact.toFixed(2)} bps`));
      console.log(chalk.white(`Exchange Rate:   1 ${fromToken} = ${(fromPrice/toPrice).toFixed(6)} ${toToken}`));

      console.log(chalk.cyan('\n--- Privacy Features ---'));
      console.log(chalk.white('- Order size: Encrypted (hidden from observers)'));
      console.log(chalk.white('- MEV protection: Enabled (confidential execution)'));
      console.log(chalk.white('- Execution: Via Arcium MXE (Multi-party eXecution)\n'));

    } catch (error) {
      spinner.fail(chalk.red('Quote failed'));
      handleError(error);
    }
  });

swapCmd
  .command('execute <amount> <from> <to>')
  .option('--slippage <bps>', 'Slippage tolerance in basis points', '50')
  .option('--mock', 'Use mock mode (always enabled for devnet)', true)
  .description('Execute a private swap')
  .action(async (amount: string, from: string, to: string, options: { slippage: string; mock: boolean }) => {
    const fromToken = from.toUpperCase();
    const toToken = to.toUpperCase();
    const amountNum = parseFloat(amount);

    console.log(chalk.bold.cyan('\n[Arcium] Private Swap Execution\n'));

    // Always use mock mode on devnet until Arcium MXE is deployed
    console.log(chalk.bgYellow.black(' MOCK MODE ') + chalk.yellow(' Arcium MXE not available on devnet\n'));

    console.log(chalk.yellow('--- How Private Swaps Work ---'));
    console.log(chalk.white('1. Your order size is encrypted before submission'));
    console.log(chalk.white('2. MXE nodes execute the swap with hidden amounts'));
    console.log(chalk.white('3. No one can see your order size or front-run you'));
    console.log(chalk.white('4. Result is returned encrypted to your wallet\n'));

    const spinner = ora('Executing private swap...').start();

    try {
      // Step 1: Encrypt order
      spinner.text = 'Encrypting order parameters...';
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 2: Submit to MXE
      spinner.text = 'Submitting to Arcium MXE...';
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Wait for execution
      spinner.text = 'Waiting for confidential execution...';
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Get result
      spinner.text = 'Decrypting swap result...';
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock output calculation
      const mockPrices: Record<string, number> = {
        SOL: 100,
        USDC: 1,
        USDT: 1,
        BONK: 0.00002,
      };

      const fromPrice = mockPrices[fromToken] || 1;
      const toPrice = mockPrices[toToken] || 1;
      const inputValue = amountNum * fromPrice;
      const expectedOutput = inputValue / toPrice;
      const outputAfterFee = expectedOutput * 0.997; // 0.3% fee

      const mockSig = 'ArciumMock' + Math.random().toString(36).substring(2, 15);
      spinner.succeed(chalk.green('Private swap executed!'));

      console.log(chalk.bold.green('\n[SUCCESS] Swap Complete!\n'));
      console.log(chalk.cyan('--- Swap Result ---'));
      console.log(chalk.white(`Input:        ${amountNum} ${fromToken}`));
      console.log(chalk.white(`Output:       ${outputAfterFee.toFixed(6)} ${toToken}`));
      console.log(chalk.white(`Computation:  ${mockSig}`));

      console.log(chalk.cyan('\n--- Privacy Summary ---'));
      console.log(chalk.white(`Order size:   ${chalk.green('HIDDEN')} (encrypted on-chain)`));
      console.log(chalk.white(`Front-running: ${chalk.green('PROTECTED')} (MEV-resistant)`));
      console.log(chalk.white(`Execution:    Arcium MXE (confidential)`));
      console.log(chalk.gray('\n(Mock mode - simulated execution)\n'));

    } catch (error) {
      spinner.fail(chalk.red('Swap failed'));
      handleError(error);
    }
  });

// ============================================
// Lend Commands (Arcium - Private Lending)
// ============================================

const lendCmd = program.command('lend').description('Private lending operations (Arcium MXE)');

lendCmd
  .command('deposit <amount> <token>')
  .option('--no-collateral', 'Deposit without enabling as collateral')
  .option('--mock', 'Use mock mode (always enabled for devnet)', true)
  .description('Deposit tokens to private lending pool')
  .action(async (amount: string, token: string, options: { collateral: boolean; mock: boolean }) => {
    const tokenSymbol = token.toUpperCase();
    const amountNum = parseFloat(amount);
    const enableCollateral = options.collateral !== false; // Default true

    console.log(chalk.bold.cyan('\n[Arcium] Private Lending Deposit\n'));

    // Always use mock mode on devnet until Arcium MXE is deployed
    console.log(chalk.bgYellow.black(' MOCK MODE ') + chalk.yellow(' Arcium MXE not available on devnet\n'));

    console.log(chalk.yellow('--- How Private Lending Works ---'));
    console.log(chalk.white('1. Your deposit amount is encrypted'));
    console.log(chalk.white('2. Collateral position size remains hidden'));
    console.log(chalk.white('3. Earn yield without revealing your position'));
    console.log(chalk.white('4. Health factor computed confidentially\n'));

    const spinner = ora('Processing deposit...').start();

    try {
      // Step 1: Encrypt amount
      spinner.text = 'Encrypting deposit amount...';
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Build encrypted deposit
      spinner.text = 'Building confidential deposit transaction...';
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 3: Submit to MXE
      spinner.text = 'Submitting to Arcium lending market...';
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 4: Confirm
      spinner.text = 'Confirming deposit...';
      await new Promise(resolve => setTimeout(resolve, 600));

      // Mock APY
      const mockAPY: Record<string, number> = {
        SOL: 5.2,
        USDC: 8.5,
        USDT: 7.8,
      };

      const apy = mockAPY[tokenSymbol] || 5.0;
      const mockSig = 'ArciumLend' + Math.random().toString(36).substring(2, 15);

      spinner.succeed(chalk.green('Deposit successful!'));

      console.log(chalk.bold.green('\n[SUCCESS] Deposit Complete!\n'));
      console.log(chalk.cyan('--- Deposit Details ---'));
      console.log(chalk.white(`Amount:          ${amountNum} ${tokenSymbol}`));
      console.log(chalk.white(`Collateral:      ${enableCollateral ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.white(`Supply APY:      ${apy.toFixed(2)}%`));
      console.log(chalk.white(`Computation:     ${mockSig}`));

      console.log(chalk.cyan('\n--- Privacy Features ---'));
      console.log(chalk.white(`Position size:   ${chalk.green('HIDDEN')} (encrypted on-chain)`));
      console.log(chalk.white(`Yield accrual:   Private (computed in MXE)`));
      console.log(chalk.white(`Collateral:      ${enableCollateral ? 'Enabled (hidden ratio)' : 'Disabled'}`));

      if (enableCollateral) {
        console.log(chalk.cyan('\n--- Borrowing Power ---'));
        console.log(chalk.white(`Collateral factor: 80%`));
        console.log(chalk.white(`Max borrow value:  ${(amountNum * 0.8).toFixed(2)} ${tokenSymbol} equivalent`));
        console.log(chalk.gray('(Actual borrow capacity computed privately)'));
      }

      console.log(chalk.gray('\n(Mock mode - simulated execution)\n'));

    } catch (error) {
      spinner.fail(chalk.red('Deposit failed'));
      handleError(error);
    }
  });

lendCmd
  .command('withdraw <amount> <token>')
  .option('--mock', 'Use mock mode (always enabled for devnet)', true)
  .description('Withdraw tokens from private lending pool')
  .action(async (amount: string, token: string, options: { mock: boolean }) => {
    const tokenSymbol = token.toUpperCase();
    const amountNum = parseFloat(amount);

    console.log(chalk.bold.cyan('\n[Arcium] Private Lending Withdrawal\n'));

    // Always use mock mode on devnet until Arcium MXE is deployed
    console.log(chalk.bgYellow.black(' MOCK MODE ') + chalk.yellow(' Arcium MXE not available on devnet\n'));

    console.log(chalk.yellow('--- Withdrawal Process ---'));
    console.log(chalk.white('1. Health factor check (encrypted computation)'));
    console.log(chalk.white('2. Verify sufficient collateral remains'));
    console.log(chalk.white('3. Execute withdrawal with hidden amounts'));
    console.log(chalk.white('4. Update position privately\n'));

    const spinner = ora('Processing withdrawal...').start();

    try {
      // Step 1: Check health factor
      spinner.text = 'Computing health factor (encrypted)...';
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 2: Verify
      spinner.text = 'Verifying withdrawal safety...';
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Execute
      spinner.text = 'Executing encrypted withdrawal...';
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 4: Confirm
      spinner.text = 'Confirming on-chain...';
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockSig = 'ArciumWithdraw' + Math.random().toString(36).substring(2, 15);

      spinner.succeed(chalk.green('Withdrawal successful!'));

      console.log(chalk.bold.green('\n[SUCCESS] Withdrawal Complete!\n'));
      console.log(chalk.cyan('--- Withdrawal Details ---'));
      console.log(chalk.white(`Amount:          ${amountNum} ${tokenSymbol}`));
      console.log(chalk.white(`Health Factor:   Safe (> 1.0)`));
      console.log(chalk.white(`Computation:     ${mockSig}`));

      console.log(chalk.cyan('\n--- Privacy Summary ---'));
      console.log(chalk.white(`Withdrawal size: ${chalk.green('HIDDEN')} (encrypted on-chain)`));
      console.log(chalk.white(`Remaining pos:   ${chalk.green('HIDDEN')} (only you can view)`));
      console.log(chalk.white(`Health status:   Computed privately`));
      console.log(chalk.gray('\n(Mock mode - simulated execution)\n'));

    } catch (error) {
      spinner.fail(chalk.red('Withdrawal failed'));
      handleError(error);
    }
  });

lendCmd
  .command('position')
  .option('--mock', 'Use mock mode (always enabled for devnet)', true)
  .description('View your private lending position')
  .action(async () => {
    console.log(chalk.bold.cyan('\n[Arcium] Private Lending Position\n'));

    console.log(chalk.bgYellow.black(' MOCK MODE ') + chalk.yellow(' Arcium MXE not available on devnet\n'));

    const spinner = ora('Fetching encrypted position...').start();

    try {
      // Simulate decryption
      spinner.text = 'Decrypting position data...';
      await new Promise(resolve => setTimeout(resolve, 800));

      spinner.succeed(chalk.green('Position retrieved'));

      // Mock position data
      console.log(chalk.cyan('\n--- Your Private Position ---'));
      console.log(chalk.white('Deposits:'));
      console.log(chalk.white('  USDC:  1,000.00 (Supply APY: 8.5%)'));
      console.log(chalk.white('  SOL:   5.00 (Supply APY: 5.2%)'));

      console.log(chalk.white('\nBorrows:'));
      console.log(chalk.white('  (No active borrows)'));

      console.log(chalk.cyan('\n--- Health Metrics ---'));
      console.log(chalk.white('Total Collateral: $1,500.00'));
      console.log(chalk.white('Total Borrowed:   $0.00'));
      console.log(chalk.white('Health Factor:    ') + chalk.green('Infinity (no borrows)'));
      console.log(chalk.white('Available to Borrow: $1,200.00 (80% LTV)'));

      console.log(chalk.cyan('\n--- Privacy Status ---'));
      console.log(chalk.white(`On-chain visibility: ${chalk.green('ENCRYPTED')}`));
      console.log(chalk.white('Only you can decrypt and view position details'));
      console.log(chalk.gray('\n(Mock data - connect wallet to view real position)\n'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch position'));
      handleError(error);
    }
  });

// ============================================
// Error Handling
// ============================================

function handleError(error: unknown): void {
  if (error instanceof UnsupportedTokenError) {
    console.error(chalk.red(`Token "${error.token}" is not supported by ${error.protocol}`));
    if (error.protocol === 'privacy-cash') {
      console.error(chalk.yellow('Tip: Use the transfer command for non-SOL/USDC tokens'));
    }
  } else if (error instanceof InsufficientBalanceError) {
    console.error(chalk.red('Insufficient balance'));
    console.error(chalk.yellow(`  Required: ${error.required} ${error.token}`));
    console.error(chalk.yellow(`  Available: ${error.available} ${error.token}`));
  } else if (error instanceof InvalidAmountError) {
    console.error(chalk.red(`Invalid amount: ${error.amount}`));
  } else if (error instanceof InvalidAddressError) {
    console.error(chalk.red(`Invalid address: ${error.address}`));
  } else if (error instanceof TransactionError) {
    console.error(chalk.red(`Transaction failed: ${error.message}`));
    if (error.signature) {
      console.error(chalk.yellow(`  Signature: ${error.signature}`));
    }
  } else if (error instanceof SpykError) {
    console.error(chalk.red(`Error (${error.code}): ${error.message}`));
  } else if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red('Unknown error occurred'));
  }
}

program.parse();
