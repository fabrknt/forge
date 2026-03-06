export type KycLevel = "none" | "basic" | "standard" | "enhanced" | "institutional";

export type WhitelistStatus = "active" | "expired" | "revoked" | "not_found";

export interface IdentityVerification {
  wallet: string;
  kycLevel: KycLevel;
  whitelistStatus: WhitelistStatus;
  jurisdiction: string | null;
  verifiedAt: number | null;
  expiresAt: number | null;
}
