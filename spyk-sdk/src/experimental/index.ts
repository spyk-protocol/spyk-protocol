/**
 * Experimental Features Module
 *
 * This module contains experimental features that are disabled by default.
 * To enable, use the experimental configuration option or environment variables.
 *
 * WARNING: Experimental features are NOT audited and may have security vulnerabilities.
 * Use at your own risk in production environments.
 */

// ============================================
// Feature Flag Types
// ============================================

/**
 * Configuration for experimental features
 */
export interface ExperimentalConfig {
  /**
   * Enable Aztec/Noir ZK proofs via Sunspot
   * WARNING: Unaudited - use at your own risk
   * @default false
   */
  noirProofs?: boolean;
}

/**
 * Environment variable names for experimental features
 */
export const EXPERIMENTAL_ENV_VARS = {
  NOIR_PROOFS: 'SPYK_EXPERIMENTAL_NOIR',
} as const;

// ============================================
// Feature Flag Utilities
// ============================================

/**
 * Check if a feature is enabled via config or environment variable
 */
export function isFeatureEnabled(
  featureName: keyof ExperimentalConfig,
  config?: ExperimentalConfig
): boolean {
  // Check config first
  if (config?.[featureName] === true) {
    return true;
  }

  // Check environment variable
  const envVarMap: Record<keyof ExperimentalConfig, string> = {
    noirProofs: EXPERIMENTAL_ENV_VARS.NOIR_PROOFS,
  };

  const envVar = envVarMap[featureName];
  if (envVar && process.env[envVar]?.toLowerCase() === 'true') {
    return true;
  }

  return false;
}

/**
 * Assert that a feature is enabled, throwing if not
 * @throws Error if feature is not enabled
 */
export function assertFeatureEnabled(
  featureName: keyof ExperimentalConfig,
  config?: ExperimentalConfig
): void {
  if (!isFeatureEnabled(featureName, config)) {
    const envVar = EXPERIMENTAL_ENV_VARS[featureName.toUpperCase() as keyof typeof EXPERIMENTAL_ENV_VARS];
    throw new Error(
      `Experimental feature "${featureName}" is not enabled. ` +
      `Enable with { experimental: { ${featureName}: true } } ` +
      `or set ${envVar}=true environment variable. ` +
      `WARNING: Experimental features are NOT audited.`
    );
  }
}

/**
 * Log a warning when an experimental feature is used
 */
export function warnExperimentalUsage(featureName: string): void {
  console.warn(
    `\x1b[33m[SPYK WARNING]\x1b[0m Using experimental feature: ${featureName}. ` +
    `This feature is NOT audited and may have security vulnerabilities. ` +
    `Use at your own risk.`
  );
}

// ============================================
// Exports
// ============================================

// Noir/Sunspot integration (guarded)
export * from './noir';
