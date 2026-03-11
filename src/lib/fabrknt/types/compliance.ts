export type Jurisdiction = "MAS" | "SFC" | "FSA";

export interface WalletScreenResult {
  address: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  jurisdictions: Jurisdiction[];
  screenedAt: number;
  cleared: boolean;
  /** Confidence score from screening provider (0-1) */
  confidence?: number;
  /** External provider that produced the result */
  provider?: string;
}

export interface PoolComplianceResult {
  protocol: string;
  poolId: string;
  compliant: boolean;
  flags: string[];
  jurisdictionResults: Array<{
    jurisdiction: Jurisdiction;
    compliant: boolean;
    notes: string[];
  }>;
  screenedAt: number;
}

export interface ComplianceAlert {
  type: "unverified_protocol" | "concentration_risk" | "regulatory_change" | "sanctions_match";
  severity: "critical" | "warning" | "info";
  protocol: string;
  poolId: string;
  message: string;
  recommendation: string;
}

// ── External Screening Provider Types ──

export type ScreeningProviderName = "internal" | "trm_labs" | "chainalysis";

export interface ScreeningProviderConfig {
  name: ScreeningProviderName;
  apiKey?: string;
  apiUrl?: string;
  enabled: boolean;
}

export interface ScreeningHit {
  provider: string;
  matchType: "exact" | "fuzzy";
  sanctionedEntity: string;
  program: string;
  listEntry: string;
  confidence: number; // 0-1
}

// ── Confidence Scoring Types ──

export interface ConfidenceScore {
  score: number; // 0-1
  level: "high" | "medium" | "low" | "very_low";
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  factor: string;
  score: number;
  description: string;
}

// ── Human-in-the-Loop Review Queue Types ──

export interface ReviewItem {
  id: string;
  type: "check" | "screen" | "report";
  status: "pending" | "approved" | "rejected" | "escalated";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewerNotes?: string;
  decision: unknown;
  metadata: {
    transactionId?: string;
    address?: string;
    jurisdiction?: string;
    riskLevel?: string;
    apiKeyId?: string;
    organizationId?: string;
  };
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  avgReviewTimeMs: number;
  byPriority: Record<string, number>;
}

export interface ReviewQueryFilters {
  status?: ReviewItem["status"];
  priority?: ReviewItem["priority"];
  type?: ReviewItem["type"];
  limit?: number;
  offset?: number;
}
