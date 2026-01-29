/**
 * Compliance Module
 * Optional compliance and risk screening for privacy-preserving payments
 *
 * IMPORTANT: Compliance checking is OPT-IN only and disabled by default.
 * Users must explicitly enable compliance and provide API credentials.
 */

// Type exports
export type {
  ComplianceResult,
  ComplianceChecker,
  RangeComplianceConfig,
  RiskLevel,
} from './types.js';

// Error export
export { ComplianceError } from './types.js';

// Implementation exports
export { RangeCompliance, MockRangeCompliance } from './range.js';
