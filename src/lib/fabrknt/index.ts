/**
 * Fabrknt SDK Integration Layer
 *
 * Dogfooding all 5 Fabrknt products within Forge.
 * Each module wraps the corresponding SDK with Forge-specific defaults.
 *
 * Products:
 * - sentinel: Transaction guard (Solana + EVM), execution patterns, Jito bundles, Flashbots/MEV-Share
 * - complr:   Off-chain compliance screening, external providers, review queue
 * - accredit: On-chain KYC/AML verification, multi-provider, compliant wrapping
 * - veil:     Encryption, ZK compression, shielded transfers, encrypted swap orders
 * - stratum:  Merkle proofs, bitfields, ZK verification, DA providers, cranker registry
 */

export { sentinel } from "./sentinel";
export { compliance } from "./compliance";
export { identity } from "./identity";
export { privacy } from "./privacy";
export { data } from "./data";

// Re-export key types for convenience
export type {
  GuardConfig,
  Transaction,
  ValidationResult,
  SecurityWarning,
  PatternId,
  SimulationConfig,
  SimulationResult,
  FlashbotsBundle,
  MevShareBundle,
  FlashbotsBundleConfig,
  AuthSigner,
  BundleResult,
  DCAConfig,
  RebalanceConfig,
  GridTradingConfig,
} from "./types/sentinel";

export type {
  Jurisdiction,
  WalletScreenResult,
  PoolComplianceResult,
  ComplianceAlert,
  ScreeningProviderConfig,
  ScreeningProviderName,
  ConfidenceScore,
  ReviewItem,
  ReviewStats,
} from "./types/compliance";

export type {
  KycLevel,
  KycProvider,
  IdentityVerification,
  KycProviderConfig,
  WrapperConfig,
  WrapRequest,
  WrapResult,
  InstitutionalDashboard,
} from "./types/identity";

export type {
  EncryptedAllocation,
  SharedAccess,
  PrivacyConfig,
  ZkCompressionConfig,
  CompressedPayload,
  CompressionSavings,
  ShieldedTransferParams,
  ShieldedBalance,
  EncryptedSwapOrder,
  SwapOrderSchema,
} from "./types/privacy";

export type {
  AllocationProof,
  PoolTracker,
  ZKProofSystem,
  ZKProof,
  ZKArtifact,
  ZKVerifier,
  DAProviderType,
  DACommitment,
  DAConfig,
  CrankerConfig,
  CrankerRegistryState,
} from "./types/data";
