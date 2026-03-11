/**
 * @complr integration — Off-chain compliance screening.
 *
 * Usage in Forge:
 * - Screen wallets during onboarding (risk scoring)
 * - Check pools against regulatory blacklists before recommending
 * - Generate compliance alerts when allocated pools face regulatory issues
 * - External screening provider support (TRM Labs, Chainalysis)
 * - Confidence scoring for regulatory queries
 * - Human-in-the-loop review queue for flagged transactions
 */

import type {
  Jurisdiction,
  WalletScreenResult,
  PoolComplianceResult,
  ComplianceAlert,
  ScreeningProviderConfig,
  ScreeningProviderName,
  ScreeningHit,
  ConfidenceScore,
  ConfidenceFactor,
  ReviewItem,
  ReviewStats,
  ReviewQueryFilters,
} from "./types/compliance";

// ---------------------------------------------------------------------------
// Screening provider registry
// ---------------------------------------------------------------------------

const screeningProviders = new Map<ScreeningProviderName, ScreeningProviderConfig>();

// Internal provider is always available
screeningProviders.set("internal", {
  name: "internal",
  enabled: true,
});

/**
 * Register an external screening provider (TRM Labs, Chainalysis).
 * In production: configures the Complr SDK to route screening through the provider.
 */
export function registerScreeningProvider(config: ScreeningProviderConfig): void {
  screeningProviders.set(config.name, config);
}

/**
 * Get all registered screening providers.
 */
export function getScreeningProviders(): ScreeningProviderConfig[] {
  return Array.from(screeningProviders.values());
}

// ---------------------------------------------------------------------------
// Wallet screening
// ---------------------------------------------------------------------------

export async function screenWallet(
  address: string,
  jurisdictions: Jurisdiction[] = ["MAS", "FSA"],
  options?: { providers?: ScreeningProviderName[] }
): Promise<WalletScreenResult> {
  // In production: calls ComplrClient.screenWallet() and external providers
  const riskFactors: string[] = [];
  let riskScore = 0;
  const hits: ScreeningHit[] = [];

  // Check address format validity
  if (address.length < 32 || address.length > 44) {
    riskFactors.push("Invalid address format");
    riskScore += 50;
  }

  // Simulate sanctions list check per jurisdiction
  for (const j of jurisdictions) {
    // In production: await complrClient.checkAddress(address, j)
    const clean = true; // placeholder
    if (!clean) {
      riskFactors.push(`Flagged by ${j} sanctions list`);
      riskScore += 40;
    }
  }

  // Run external provider screening if configured
  const providersToUse = options?.providers ?? ["internal"];
  for (const providerName of providersToUse) {
    const provider = screeningProviders.get(providerName);
    if (!provider || !provider.enabled) continue;

    if (providerName === "trm_labs" && provider.apiKey) {
      // In production: calls TRM Labs API
      // const result = await trmClient.screenAddress(address);
      // hits.push(...result.hits);
    }

    if (providerName === "chainalysis" && provider.apiKey) {
      // In production: calls Chainalysis API
      // const result = await chainalysisClient.screenAddress(address);
      // hits.push(...result.hits);
    }
  }

  // Aggregate hits into risk score
  for (const hit of hits) {
    riskScore += Math.floor(hit.confidence * 50);
    riskFactors.push(`${hit.provider}: ${hit.sanctionedEntity} (${hit.matchType})`);
  }

  const finalScore = Math.min(riskScore, 100);
  const riskLevel =
    finalScore > 80 ? "critical" :
    finalScore > 60 ? "high" :
    finalScore > 30 ? "medium" : "low";

  return {
    address,
    riskScore: finalScore,
    riskLevel,
    riskFactors,
    jurisdictions,
    screenedAt: Date.now(),
    cleared: finalScore < 30,
    confidence: hits.length > 0 ? Math.max(...hits.map((h) => h.confidence)) : undefined,
    provider: providersToUse.length > 1 ? "multi" : providersToUse[0],
  };
}

// ---------------------------------------------------------------------------
// Pool / protocol compliance screening
// ---------------------------------------------------------------------------

const KNOWN_COMPLIANT_PROTOCOLS = new Set([
  "kamino",
  "marginfi",
  "save",
  "meteora",
  "raydium",
  "orca",
  "jupiter",
  "jito",
  "marinade",
  "sanctum",
  "drift",
  "solblaze",
  // EVM protocols
  "aave",
  "compound",
  "morpho",
  "lido",
  "rocketpool",
  "maker",
  "uniswap",
  "curve",
]);

export async function screenPool(
  protocol: string,
  poolId: string,
  jurisdictions: Jurisdiction[] = ["MAS", "FSA"]
): Promise<PoolComplianceResult> {
  const flags: string[] = [];

  // Protocol-level screening
  const isKnown = KNOWN_COMPLIANT_PROTOCOLS.has(protocol.toLowerCase());
  if (!isKnown) {
    flags.push(`Protocol "${protocol}" not in compliant registry`);
  }

  // Jurisdiction-level checks
  // In production: await complrClient.checkProtocol(protocol, jurisdictions)
  const jurisdictionResults = jurisdictions.map((j) => ({
    jurisdiction: j,
    compliant: isKnown, // placeholder — real check queries complr API
    notes: isKnown ? [] : [`${protocol} not verified for ${j}`],
  }));

  return {
    protocol,
    poolId,
    compliant: flags.length === 0,
    flags,
    jurisdictionResults,
    screenedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Compliance alerts for allocated pools
// ---------------------------------------------------------------------------

export function checkAllocationCompliance(
  allocations: Array<{ protocol: string; poolId: string; percentage: number }>
): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];

  for (const alloc of allocations) {
    if (!KNOWN_COMPLIANT_PROTOCOLS.has(alloc.protocol.toLowerCase())) {
      alerts.push({
        type: "unverified_protocol",
        severity: "warning",
        protocol: alloc.protocol,
        poolId: alloc.poolId,
        message: `${alloc.protocol} is not in the verified protocol registry. Allocation: ${alloc.percentage}%`,
        recommendation: "Consider replacing with a verified protocol.",
      });
    }

    // High concentration in single protocol
    if (alloc.percentage > 40) {
      alerts.push({
        type: "concentration_risk",
        severity: "info",
        protocol: alloc.protocol,
        poolId: alloc.poolId,
        message: `${alloc.percentage}% allocation in ${alloc.protocol} exceeds concentration guidelines.`,
        recommendation:
          "Diversify across multiple protocols to reduce single-protocol risk.",
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Confidence scoring for compliance queries
// In production: uses @complr ConfidenceScorer
// ---------------------------------------------------------------------------

export function calculateConfidence(params: {
  sourcesUsed: number;
  sourcesAvailable: number;
  hasSpecificReferences: boolean;
  documentRecencyDays: number;
}): ConfidenceScore {
  const factors: ConfidenceFactor[] = [];

  // Source coverage
  const coverage = params.sourcesAvailable > 0
    ? params.sourcesUsed / params.sourcesAvailable
    : 0;
  factors.push({
    factor: "source_coverage",
    score: coverage,
    description: coverage >= 0.7
      ? "Well-supported by available regulatory documents"
      : coverage >= 0.4
        ? "Partially supported by available documents"
        : "Limited source material available",
  });

  // Recency
  const recency =
    params.documentRecencyDays <= 90 ? 1.0 :
    params.documentRecencyDays <= 365 ? 0.7 :
    0.3;
  factors.push({
    factor: "recency",
    score: recency,
    description: recency >= 0.7
      ? "Source documents are recent and likely current"
      : "Source documents may not reflect current regulations",
  });

  // Specificity
  const specificity = params.hasSpecificReferences ? 0.8 : 0.3;
  factors.push({
    factor: "specificity",
    score: specificity,
    description: params.hasSpecificReferences
      ? "Contains specific regulatory references"
      : "General without specific regulatory references",
  });

  const overallScore = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const level: ConfidenceScore["level"] =
    overallScore >= 0.7 ? "high" :
    overallScore >= 0.5 ? "medium" :
    overallScore >= 0.3 ? "low" : "very_low";

  return {
    score: Math.round(overallScore * 100) / 100,
    level,
    factors,
  };
}

// ---------------------------------------------------------------------------
// Human-in-the-loop review queue (stub)
// In production: uses @complr ReviewQueue with persistent storage
// ---------------------------------------------------------------------------

const reviewQueue: ReviewItem[] = [];

export function submitForReview(params: {
  type: ReviewItem["type"];
  decision: unknown;
  metadata?: ReviewItem["metadata"];
  priority?: ReviewItem["priority"];
}): ReviewItem {
  const now = new Date().toISOString();
  const item: ReviewItem = {
    id: `rv_${Math.random().toString(36).slice(2, 18)}`,
    type: params.type,
    status: "pending",
    priority: params.priority ?? "low",
    createdAt: now,
    updatedAt: now,
    decision: params.decision,
    metadata: params.metadata ?? {},
  };

  reviewQueue.push(item);
  return item;
}

export function resolveReview(
  id: string,
  status: "approved" | "rejected" | "escalated",
  reviewerId: string,
  notes?: string
): ReviewItem | undefined {
  const item = reviewQueue.find((r) => r.id === id);
  if (!item) return undefined;

  const now = new Date().toISOString();
  item.status = status;
  item.updatedAt = now;
  item.reviewedAt = now;
  item.reviewerId = reviewerId;
  item.reviewerNotes = notes;
  return item;
}

export function queryReviews(filters: ReviewQueryFilters = {}): { items: ReviewItem[]; total: number } {
  let items = [...reviewQueue];
  if (filters.status) items = items.filter((i) => i.status === filters.status);
  if (filters.priority) items = items.filter((i) => i.priority === filters.priority);
  if (filters.type) items = items.filter((i) => i.type === filters.type);

  items.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;
  return { items: items.slice(offset, offset + limit), total };
}

export function getReviewStats(): ReviewStats {
  const all = reviewQueue;
  const resolved = all.filter((i) => i.reviewedAt);
  let avgReviewTimeMs = 0;
  if (resolved.length > 0) {
    const totalMs = resolved.reduce((sum, i) => {
      return sum + (new Date(i.reviewedAt!).getTime() - new Date(i.createdAt).getTime());
    }, 0);
    avgReviewTimeMs = Math.round(totalMs / resolved.length);
  }

  const byPriority: Record<string, number> = {};
  for (const item of all) {
    byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
  }

  return {
    total: all.length,
    pending: all.filter((i) => i.status === "pending").length,
    approved: all.filter((i) => i.status === "approved").length,
    rejected: all.filter((i) => i.status === "rejected").length,
    escalated: all.filter((i) => i.status === "escalated").length,
    avgReviewTimeMs,
    byPriority,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const compliance = {
  screenWallet,
  screenPool,
  checkAllocationCompliance,
  // External screening providers
  registerScreeningProvider,
  getScreeningProviders,
  // Confidence scoring
  calculateConfidence,
  // Review queue
  submitForReview,
  resolveReview,
  queryReviews,
  getReviewStats,
};
