/**
 * POST /api/spyk/compliance
 *
 * Generate a Noir ZK proof of OFAC non-membership for a Solana address.
 * Uses the smt_exclusion circuit to prove an address is NOT sanctioned.
 *
 * Request body:
 * - address: Solana public key to prove compliance for
 *
 * Response:
 * - proof: Base64-encoded Noir proof (388 bytes)
 * - isCompliant: Whether the address passed compliance (not sanctioned)
 * - mode: 'cli' or 'mock' indicating proof generation mode
 * - verificationTx: Transaction signature if on-chain verification was performed
 * - explorerUrl: Solscan link to verification transaction (if any)
 *
 * Notes:
 * - Uses deployed verifier: 9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t
 * - Falls back to mock proof if nargo not installed
 */

import { NextRequest } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import {
  noir,
} from '@spyk-protocol/sdk';
import { getConnection, getKeypair, handleApiError } from '../lib';

// Deployed verifier program ID on devnet
const VERIFIER_PROGRAM_ID = new PublicKey('9HA5gERa9gHxvAhr3ndpwQ9zBPkF8WP2fVjLbXZink9t');

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return Response.json(
        { error: 'Missing required field: address', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Validate address format
    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(address);
    } catch {
      return Response.json(
        { error: 'Invalid Solana address format', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Create Noir prover (auto-detects CLI vs mock mode)
    const prover = noir.createNoirProver();

    // Generate compliance proof
    const result = await prover.proveCompliance(pubkey);

    // If proof generation failed, return early
    if (!result.passed || !result.noirProof) {
      return Response.json({
        proof: null,
        isCompliant: false,
        mode: prover.getMode(),
        verificationTx: null,
        explorerUrl: null,
        message: 'Address may be sanctioned or proof generation failed',
      });
    }

    // Attempt on-chain verification
    let verificationTx: string | null = null;
    let verificationError: string | null = null;

    try {
      const connection = getConnection();
      const keypair = getKeypair();

      // Create verifier (auto-detects if program is deployed)
      const verifier = await noir.createAutoVerifier(connection, keypair, {
        network: 'devnet',
      });

      // Verify proof on-chain (or locally with mock verifier)
      const verification = await verifier.verifyOnChain(result.noirProof);

      if (verification.verified && verification.signature) {
        verificationTx = verification.signature;
      } else if (verification.error) {
        verificationError = verification.error;
      }
    } catch (error) {
      // Verification is optional - don't fail the request
      console.warn('[Compliance API] Verification failed:', error);
      verificationError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Encode proof as base64 for JSON response
    const proofBase64 = Buffer.from(result.noirProof.proof).toString('base64');

    return Response.json({
      proof: proofBase64,
      isCompliant: result.passed,
      mode: prover.getMode(),
      verificationTx,
      explorerUrl: verificationTx && !verificationTx.startsWith('mock_')
        ? `https://solscan.io/tx/${verificationTx}?cluster=devnet`
        : null,
      // Include additional metadata
      metadata: {
        circuit: result.noirProof.metadata.circuit,
        noirVersion: result.noirProof.metadata.noirVersion,
        proofSize: result.noirProof.metadata.size,
        timestamp: result.noirProof.metadata.timestamp,
        verificationError,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
