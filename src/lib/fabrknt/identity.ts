/**
 * @accredit integration — On-chain KYC/AML verification.
 *
 * Usage in Forge:
 * - Verify user whitelist status before allowing pool access
 * - Check KYC level for premium/institutional features
 * - Blacklist screening before transaction execution
 * - Multi-provider KYC support (Civic, World ID, internal)
 * - Compliant token wrapping/unwrapping
 * - Institutional dashboard data
 */

import type {
  KycLevel,
  KycProvider,
  WhitelistStatus,
  IdentityVerification,
  KycProviderConfig,
  KycVerificationRequest,
  KycVerificationResponse,
  WrapperConfig,
  WrapRequest,
  WrapResult,
  InstitutionalDashboard,
  InstitutionalActivity,
  KYC_LEVEL_ORDER,
} from "./types/identity";

// ---------------------------------------------------------------------------
// Multi-provider KYC registry
// ---------------------------------------------------------------------------

const kycProviders = new Map<KycProvider, KycProviderConfig>();

// Internal provider is always available
kycProviders.set("internal", {
  provider: "internal",
  enabled: true,
});

/**
 * Register a KYC provider (Civic, World ID, etc.).
 * In production: configures the Accredit SDK to route verification.
 */
export function registerKycProvider(config: KycProviderConfig): void {
  kycProviders.set(config.provider, config);
}

/**
 * Get all registered KYC providers.
 */
export function getKycProviders(): KycProviderConfig[] {
  return Array.from(kycProviders.values());
}

// ---------------------------------------------------------------------------
// KYC verification
// ---------------------------------------------------------------------------

export async function verifyIdentity(
  walletAddress: string,
  options?: { provider?: KycProvider }
): Promise<IdentityVerification> {
  // In production: queries accredit on-chain program via KycClient
  // findWhitelistEntryPda(wallet, programId) -> fetch account data
  // If provider specified, routes to that provider's SDK

  const provider = options?.provider ?? "internal";

  if (provider === "civic") {
    // In production: uses Civic Pass SDK
    // const pass = await civicClient.getPass(walletAddress);
    return {
      wallet: walletAddress,
      kycLevel: "none",
      whitelistStatus: "not_found",
      jurisdiction: null,
      verifiedAt: null,
      expiresAt: null,
      provider: "civic",
    };
  }

  if (provider === "world_id") {
    // In production: uses World ID SDK
    // const proof = await worldIdClient.verify(walletAddress);
    return {
      wallet: walletAddress,
      kycLevel: "none",
      whitelistStatus: "not_found",
      jurisdiction: null,
      verifiedAt: null,
      expiresAt: null,
      provider: "world_id",
    };
  }

  // Default: internal / on-chain verification
  return {
    wallet: walletAddress,
    kycLevel: "none",
    whitelistStatus: "not_found",
    jurisdiction: null,
    verifiedAt: null,
    expiresAt: null,
    provider: "internal",
  };
}

/**
 * Verify identity with a specific KYC level request.
 * In production: routes to the appropriate provider and initiates verification flow.
 */
export async function requestVerification(
  request: KycVerificationRequest
): Promise<KycVerificationResponse> {
  const provider = request.provider ?? "internal";

  // In production: initiates KYC flow with the selected provider
  return {
    wallet: request.wallet,
    provider,
    kycLevel: "none",
    status: "pending",
    verifiedAt: null,
    expiresAt: null,
  };
}

// ---------------------------------------------------------------------------
// Whitelist check — gate pool access
// ---------------------------------------------------------------------------

const LEVEL_ORDER: Record<KycLevel, number> = {
  none: 0,
  basic: 1,
  standard: 2,
  enhanced: 3,
  institutional: 4,
};

export function isAllowedForPool(
  verification: IdentityVerification,
  requiredLevel: KycLevel
): boolean {
  return LEVEL_ORDER[verification.kycLevel] >= LEVEL_ORDER[requiredLevel];
}

// ---------------------------------------------------------------------------
// Blacklist check
// ---------------------------------------------------------------------------

export async function isBlacklisted(walletAddress: string): Promise<boolean> {
  // In production: queries BlacklistClient.findBlacklistEntryPda()
  // Returns true if wallet has a blacklist PDA entry
  return false; // placeholder
}

// ---------------------------------------------------------------------------
// Feature gating based on KYC level
// ---------------------------------------------------------------------------

const FEATURE_REQUIREMENTS: Record<string, KycLevel> = {
  "paper-trading": "none",
  "explore-pools": "none",
  "ai-recommendations": "none",
  "execute-allocation": "basic",
  "morpho-vaults": "standard",
  "data-room-access": "standard",
  "create-listing": "enhanced",
  "institutional-api": "institutional",
  "compliant-wrapping": "basic",
  "dark-pool-access": "enhanced",
};

export function canAccessFeature(
  verification: IdentityVerification,
  feature: string
): boolean {
  const required = FEATURE_REQUIREMENTS[feature] ?? "none";
  return isAllowedForPool(verification, required);
}

// ---------------------------------------------------------------------------
// Compliant token wrapping (mirrors @accredit/core wrapper)
// In production: uses WrapperClient on-chain interactions
// ---------------------------------------------------------------------------

/**
 * Wrap underlying tokens into compliant wrapped tokens.
 * Requires KYC verification at the wrapper's minimum level.
 */
export async function wrapTokens(
  request: WrapRequest,
  verification: IdentityVerification
): Promise<WrapResult> {
  // In production: calls WrapperClient.wrap()
  // 1. Verify KYC level meets wrapper minimum
  // 2. Transfer underlying tokens to vault
  // 3. Mint wrapped tokens to user

  // Placeholder
  return {
    success: false,
    wrappedAmount: BigInt(0),
    fee: BigInt(0),
    wrappedMint: "",
  };
}

/**
 * Unwrap compliant wrapped tokens back to underlying.
 */
export async function unwrapTokens(
  request: WrapRequest,
  verification: IdentityVerification
): Promise<WrapResult> {
  // In production: calls WrapperClient.unwrap()
  return {
    success: false,
    wrappedAmount: BigInt(0),
    fee: BigInt(0),
    wrappedMint: "",
  };
}

// ---------------------------------------------------------------------------
// Institutional dashboard (stub)
// In production: aggregates data from on-chain accounts
// ---------------------------------------------------------------------------

export async function getInstitutionalDashboard(
  organizationId: string
): Promise<InstitutionalDashboard> {
  // In production: queries multiple on-chain accounts and aggregates
  return {
    organizationId,
    totalWallets: 0,
    verifiedWallets: 0,
    pendingVerifications: 0,
    kycDistribution: {
      none: 0,
      basic: 0,
      standard: 0,
      enhanced: 0,
      institutional: 0,
    },
    recentActivity: [],
    complianceScore: 0,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const identity = {
  verifyIdentity,
  requestVerification,
  isAllowedForPool,
  isBlacklisted,
  canAccessFeature,
  // Multi-provider KYC
  registerKycProvider,
  getKycProviders,
  // Compliant wrapping
  wrapTokens,
  unwrapTokens,
  // Institutional
  getInstitutionalDashboard,
};
