export type KycLevel = "none" | "basic" | "standard" | "enhanced" | "institutional";

export type WhitelistStatus = "active" | "expired" | "revoked" | "not_found";

export type KycProvider = "civic" | "world_id" | "internal" | "manual";

export interface IdentityVerification {
  wallet: string;
  kycLevel: KycLevel;
  whitelistStatus: WhitelistStatus;
  jurisdiction: string | null;
  verifiedAt: number | null;
  expiresAt: number | null;
  /** KYC provider used for verification */
  provider?: KycProvider;
}

// ── Multi-Provider KYC Types ──

export interface KycProviderConfig {
  provider: KycProvider;
  apiKey?: string;
  apiUrl?: string;
  enabled: boolean;
}

export interface KycVerificationRequest {
  wallet: string;
  provider?: KycProvider;
  requestedLevel: KycLevel;
  jurisdiction?: string;
}

export interface KycVerificationResponse {
  wallet: string;
  provider: KycProvider;
  kycLevel: KycLevel;
  status: "verified" | "pending" | "rejected" | "expired";
  verifiedAt: number | null;
  expiresAt: number | null;
  metadata?: Record<string, unknown>;
}

// ── Compliant Wrapper Types (mirrors @accredit/core wrapper) ──

export interface WrapperConfig {
  authority: string;
  underlyingMint: string;
  wrappedMint: string;
  vault: string;
  kycRegistry: string;
  totalWrapped: bigint;
  isActive: boolean;
  minKycLevel: KycLevel;
  feeBps: number;
  feeRecipient: string;
}

export interface WrapRequest {
  wallet: string;
  underlyingMint: string;
  amount: bigint;
}

export interface UnwrapRequest {
  wallet: string;
  underlyingMint: string;
  amount: bigint;
}

export interface WrapResult {
  success: boolean;
  wrappedAmount: bigint;
  fee: bigint;
  wrappedMint: string;
  txSignature?: string;
}

// ── Institutional Dashboard Types ──

export interface InstitutionalDashboard {
  organizationId: string;
  totalWallets: number;
  verifiedWallets: number;
  pendingVerifications: number;
  kycDistribution: Record<KycLevel, number>;
  recentActivity: InstitutionalActivity[];
  complianceScore: number; // 0-100
}

export interface InstitutionalActivity {
  type: "verification" | "wrap" | "unwrap" | "trade" | "alert";
  wallet: string;
  timestamp: number;
  details: string;
  status: "success" | "pending" | "failed";
}

// ── KYC Trade Limits (mirrors @accredit/core) ──

export const KYC_LEVEL_ORDER: Record<KycLevel, number> = {
  none: 0,
  basic: 1,
  standard: 2,
  enhanced: 3,
  institutional: 4,
};
