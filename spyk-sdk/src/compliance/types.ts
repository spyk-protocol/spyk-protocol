/**
 * Compliance Module Types
 * Type definitions for compliance and risk screening
 */

/**
 * Risk levels returned by compliance screening
 * Matches Range API response format (lowercase)
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

/**
 * Result of a compliance pre-screening check
 */
export interface ComplianceResult {
  /** Whether the address passed compliance checks */
  compliant: boolean;
  /** Reason for non-compliance (if applicable) */
  reason?: string;
  /** Risk level assessment */
  riskLevel?: RiskLevel;
  /** Numeric risk score (0-100) */
  riskScore?: number;
  /** Timestamp of the check */
  checkedAt: Date;
  /** Address that was checked */
  address: string;
  /** Network the address was checked on */
  network?: string;
}

/**
 * Error thrown when compliance check fails
 */
export class ComplianceError extends Error {
  constructor(
    public readonly reason: string,
    public readonly address: string,
    public readonly riskLevel?: RiskLevel
  ) {
    super(`Compliance check failed for ${address}: ${reason}`);
    this.name = 'ComplianceError';
  }
}

/**
 * Interface for compliance checker implementations
 */
export interface ComplianceChecker {
  /**
   * Pre-screen an address before executing a payment
   * @param address - The blockchain address to screen
   * @param network - The network (default: 'solana')
   * @returns Compliance result
   * @throws ComplianceError if the address fails compliance
   */
  preScreen(address: string, network?: string): Promise<ComplianceResult>;

  /**
   * Check if compliance checking is enabled
   */
  isEnabled(): boolean;
}

/**
 * Configuration for Range compliance integration
 */
export interface RangeComplianceConfig {
  /** Range API key (required) */
  apiKey: string;
  /** Base URL for Range API (optional, defaults to production) */
  baseUrl?: string;
  /** Risk threshold above which to reject (0-100, default: 70) */
  riskThreshold?: number;
  /** Whether to throw on high risk (default: true) */
  rejectHighRisk?: boolean;
  /** Timeout for API calls in ms (default: 5000) */
  timeout?: number;
}
