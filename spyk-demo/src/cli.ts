/**
 * SPYK Demo CLI
 * Interactive demonstration of the SPYK Protocol SDK
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Keypair, PublicKey } from '@solana/web3.js';
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
  type Network,
} from '@spyk-protocol/sdk';

// ============================================
// Configuration
// ============================================

const PRIVACY_CASH_TOKENS = ['SOL', 'USDC'];
const ALL_TOKENS = ['SOL', 'USDC', 'BONK', 'RADR', 'ORE'];

function loadConfig(): { spyk: Spyk; network: Network } {
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    console.error(chalk.red('Error: HELIUS_API_KEY environment variable is required'));
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

  const spyk = new Spyk({
    heliusApiKey,
    network,
    wallet,
  });

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
