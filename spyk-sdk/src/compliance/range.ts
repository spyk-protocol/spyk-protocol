/**
 * Range Protocol Compliance Integration
 *
 * Provides OFAC/sanctions screening using Range Protocol's Risk API.
 * This integration is OPT-IN only and disabled by default.
 *
 * Range is a leading blockchain risk and intelligence platform that provides:
 * - OFAC/sanctions address screening
 * - Real-time risk assessment
 * - Cross-chain compliance monitoring
 *
 * @see https://docs.range.org for API documentation
 * @see https://range.org for more information
 */

import type {
  ComplianceChecker,
  ComplianceResult,
  RangeComplianceConfig,
  RiskLevel,
} from './types.js';
import { ComplianceError } from './types.js';

/**
 * Default Range API base URL
 */
const DEFAULT_BASE_URL = 'https://api.range.org';

/**
 * Default risk threshold (70% - addresses above this are considered high risk)
 */
const DEFAULT_RISK_THRESHOLD = 70;

/**
 * Default API timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Range API Risk Assessment Response
 */
interface RangeRiskResponse {
  address: string;
  risk_level: RiskLevel;
  risk_score?: number;
  sanctions_match?: boolean;
  attribution?: {
    name?: string;
    category?: string;
    description?: string;
  };
  error?: string;
}

/**
 * RangeCompliance - OFAC/sanctions screening via Range Protocol
 *
 * This class implements opt-in compliance screening for privacy-preserving payments.
 * It uses Range Protocol's Risk API to screen addresses before payment execution.
 *
 * @example
 * ```typescript
 * const compliance = new RangeCompliance({
 *   apiKey: process.env.RANGE_API_KEY!,
 *   riskThreshold: 70,
 * });
 *
 * // Screen an address before payment
 * const result = await compliance.preScreen('So11111111111111111111111111111111111111112');
 * if (result.compliant) {
 *   // Proceed with payment
 * }
 * ```
 */
export class RangeCompliance implements ComplianceChecker {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly riskThreshold: number;
  private readonly rejectHighRisk: boolean;
  private readonly timeout: number;
  private enabled: boolean = true;

  constructor(config: RangeComplianceConfig) {
    if (!config.apiKey) {
      throw new Error('Range API key is required. Get one at https://range.org or contact info@range.org');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.riskThreshold = config.riskThreshold ?? DEFAULT_RISK_THRESHOLD;
    this.rejectHighRisk = config.rejectHighRisk ?? true;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Check if compliance checking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable compliance checking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Pre-screen an address before executing a payment
   *
   * This method queries Range Protocol's Risk API to assess the risk level
   * of a blockchain address. It checks for:
   * - OFAC sanctions list matches
   * - Known malicious addresses
   * - High-risk entity attributions
   *
   * @param address - The blockchain address to screen
   * @param network - The network (default: 'solana')
   * @returns Compliance result with risk assessment
   * @throws ComplianceError if address fails screening and rejectHighRisk is true
   */
  async preScreen(address: string, network: string = 'solana'): Promise<ComplianceResult> {
    if (!this.enabled) {
      return {
        compliant: true,
        address,
        checkedAt: new Date(),
        reason: 'Compliance checking disabled',
      };
    }

    try {
      const response = await this.callRangeApi(address, network);

      const riskLevel = response.risk_level || 'unknown';
      const riskScore = response.risk_score ?? this.riskLevelToScore(riskLevel);
      const isSanctioned = response.sanctions_match === true;
      const isHighRisk = riskLevel === 'high' || riskScore >= this.riskThreshold || isSanctioned;

      const result: ComplianceResult = {
        compliant: !isHighRisk,
        riskLevel,
        riskScore,
        address,
        network,
        checkedAt: new Date(),
      };

      if (isSanctioned) {
        result.reason = 'Address matches OFAC/sanctions list';
      } else if (isHighRisk) {
        result.reason = response.attribution?.description ||
          `High risk address (score: ${riskScore}, level: ${riskLevel})`;
      }

      // Throw if non-compliant and configured to reject
      if (!result.compliant && this.rejectHighRisk) {
        throw new ComplianceError(
          result.reason || 'Address failed compliance check',
          address,
          riskLevel
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ComplianceError) {
        throw error;
      }

      // On API errors, we fail open (allow) but log the issue
      // This prevents compliance API outages from blocking all payments
      console.warn('[Range Compliance] API error, failing open:', error);

      return {
        compliant: true,
        address,
        network,
        checkedAt: new Date(),
        reason: 'Compliance check unavailable - API error',
        riskLevel: 'unknown',
      };
    }
  }

  /**
   * Call the Range Risk API
   */
  private async callRangeApi(address: string, network: string): Promise<RangeRiskResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseUrl}/v1/risk/address?address=${encodeURIComponent(address)}&network=${encodeURIComponent(network)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Range API error: ${response.status} ${errorText}`);
      }

      return await response.json() as RangeRiskResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Convert risk level to numeric score for threshold comparison
   */
  private riskLevelToScore(level: RiskLevel): number {
    switch (level) {
      case 'low':
        return 20;
      case 'medium':
        return 50;
      case 'high':
        return 90;
      case 'unknown':
      default:
        return 0;
    }
  }
}

/**
 * Create a mock compliance checker for testing
 * Always returns compliant unless address contains 'BLOCKED'
 */
export class MockRangeCompliance implements ComplianceChecker {
  private enabled: boolean = true;

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async preScreen(address: string, network: string = 'solana'): Promise<ComplianceResult> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100));

    const isBlocked = address.toUpperCase().includes('BLOCKED');

    if (isBlocked) {
      throw new ComplianceError(
        'Address on mock blocklist',
        address,
        'high'
      );
    }

    return {
      compliant: true,
      address,
      network,
      checkedAt: new Date(),
      riskLevel: 'low',
      riskScore: 10,
    };
  }
}
