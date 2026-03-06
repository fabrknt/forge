/**
 * @accredit integration — On-chain KYC/AML verification.
 *
 * Usage in Forge:
 * - Verify user whitelist status before allowing pool access
 * - Check KYC level for premium/institutional features
 * - Blacklist screening before transaction execution
 */

import type {
  KycLevel,
  WhitelistStatus,
  IdentityVerification,
} from "./types/identity";

// ---------------------------------------------------------------------------
// KYC verification
// ---------------------------------------------------------------------------

export async function verifyIdentity(
  walletAddress: string
): Promise<IdentityVerification> {
  // In production: queries accredit on-chain program via KycClient
  // findWhitelistEntryPda(wallet, programId) → fetch account data

  // Placeholder — returns unverified by default
  // Real implementation reads on-chain PDA account
  return {
    wallet: walletAddress,
    kycLevel: "none",
    whitelistStatus: "not_found",
    jurisdiction: null,
    verifiedAt: null,
    expiresAt: null,
  };
}

// ---------------------------------------------------------------------------
// Whitelist check — gate pool access
// ---------------------------------------------------------------------------

export function isAllowedForPool(
  verification: IdentityVerification,
  requiredLevel: KycLevel
): boolean {
  const levels: Record<KycLevel, number> = {
    none: 0,
    basic: 1,
    standard: 2,
    enhanced: 3,
    institutional: 4,
  };

  return levels[verification.kycLevel] >= levels[requiredLevel];
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
};

export function canAccessFeature(
  verification: IdentityVerification,
  feature: string
): boolean {
  const required = FEATURE_REQUIREMENTS[feature] ?? "none";
  return isAllowedForPool(verification, required);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const identity = {
  verifyIdentity,
  isAllowedForPool,
  isBlacklisted,
  canAccessFeature,
};
