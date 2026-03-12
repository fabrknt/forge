import { describe, it, expect, beforeEach } from "vitest";
import {
  screenWallet,
  screenPool,
  checkAllocationCompliance,
  registerScreeningProvider,
  getScreeningProviders,
  calculateConfidence,
  submitForReview,
  resolveReview,
  queryReviews,
  getReviewStats,
} from "../compliance";

// ---------------------------------------------------------------------------
// screenWallet
// ---------------------------------------------------------------------------

describe("screenWallet", () => {
  it("clears a valid-length address", async () => {
    const result = await screenWallet(
      "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV"
    );
    expect(result.cleared).toBe(true);
    expect(result.riskScore).toBeLessThan(30);
    expect(result.riskLevel).toBe("low");
    expect(result.address).toBe(
      "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV"
    );
  });

  it("flags an address with invalid length", async () => {
    const result = await screenWallet("short");
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
    expect(result.cleared).toBe(false);
    expect(result.riskFactors).toContain("Invalid address format");
  });

  it("includes jurisdiction info", async () => {
    const result = await screenWallet(
      "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
      ["MAS", "FSA", "SFC"]
    );
    expect(result.jurisdictions).toEqual(["MAS", "FSA", "SFC"]);
  });

  it("records screenedAt timestamp", async () => {
    const before = Date.now();
    const result = await screenWallet(
      "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV"
    );
    expect(result.screenedAt).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// screenPool
// ---------------------------------------------------------------------------

describe("screenPool", () => {
  it("marks known compliant protocol as compliant", async () => {
    const result = await screenPool("kamino", "pool-1");
    expect(result.compliant).toBe(true);
    expect(result.flags).toHaveLength(0);
    expect(result.protocol).toBe("kamino");
    expect(result.poolId).toBe("pool-1");
  });

  it("flags unknown protocol", async () => {
    const result = await screenPool("unknown_protocol", "pool-2");
    expect(result.compliant).toBe(false);
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags[0]).toContain("not in compliant registry");
  });

  it("includes jurisdiction results", async () => {
    const result = await screenPool("aave", "pool-3", ["MAS", "SFC"]);
    expect(result.jurisdictionResults).toHaveLength(2);
    expect(result.jurisdictionResults[0].jurisdiction).toBe("MAS");
    expect(result.jurisdictionResults[0].compliant).toBe(true);
  });

  it("is case-insensitive for protocol names", async () => {
    const result = await screenPool("AAVE", "pool-4");
    expect(result.compliant).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkAllocationCompliance
// ---------------------------------------------------------------------------

describe("checkAllocationCompliance", () => {
  it("returns no alerts for verified protocols under concentration limit", () => {
    const alerts = checkAllocationCompliance([
      { protocol: "kamino", poolId: "p1", percentage: 30 },
      { protocol: "aave", poolId: "p2", percentage: 30 },
    ]);
    expect(alerts).toHaveLength(0);
  });

  it("flags unverified protocol", () => {
    const alerts = checkAllocationCompliance([
      { protocol: "shady_protocol", poolId: "p1", percentage: 20 },
    ]);
    expect(alerts.some((a) => a.type === "unverified_protocol")).toBe(true);
  });

  it("flags concentration risk above 40%", () => {
    const alerts = checkAllocationCompliance([
      { protocol: "kamino", poolId: "p1", percentage: 50 },
    ]);
    expect(alerts.some((a) => a.type === "concentration_risk")).toBe(true);
  });

  it("can flag both unverified and concentration on same allocation", () => {
    const alerts = checkAllocationCompliance([
      { protocol: "shady", poolId: "p1", percentage: 60 },
    ]);
    expect(alerts).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Screening providers
// ---------------------------------------------------------------------------

describe("registerScreeningProvider / getScreeningProviders", () => {
  it("has internal provider by default", () => {
    const providers = getScreeningProviders();
    expect(providers.some((p) => p.name === "internal")).toBe(true);
  });

  it("registers a new provider", () => {
    registerScreeningProvider({
      name: "trm_labs" as any,
      enabled: true,
      apiKey: "test-key",
    });
    const providers = getScreeningProviders();
    expect(providers.some((p) => p.name === "trm_labs")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateConfidence
// ---------------------------------------------------------------------------

describe("calculateConfidence", () => {
  it("returns high confidence for well-supported recent data", () => {
    const result = calculateConfidence({
      sourcesUsed: 8,
      sourcesAvailable: 10,
      hasSpecificReferences: true,
      documentRecencyDays: 30,
    });

    expect(result.level).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(0.7);
    expect(result.factors).toHaveLength(3);
  });

  it("returns low confidence for sparse old data", () => {
    const result = calculateConfidence({
      sourcesUsed: 1,
      sourcesAvailable: 10,
      hasSpecificReferences: false,
      documentRecencyDays: 500,
    });

    expect(result.score).toBeLessThan(0.5);
    expect(["low", "very_low"]).toContain(result.level);
  });

  it("handles zero sources available", () => {
    const result = calculateConfidence({
      sourcesUsed: 0,
      sourcesAvailable: 0,
      hasSpecificReferences: false,
      documentRecencyDays: 30,
    });

    expect(result.score).toBeDefined();
    expect(result.factors).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

describe("review queue", () => {
  it("submits and retrieves a review item", () => {
    const item = submitForReview({
      type: "check",
      decision: { pool: "test" },
      priority: "high",
    });

    expect(item.id).toMatch(/^rv_/);
    expect(item.status).toBe("pending");
    expect(item.priority).toBe("high");
    expect(item.createdAt).toBeTruthy();
  });

  it("resolves a review", () => {
    const item = submitForReview({
      type: "check",
      decision: {},
    });

    const resolved = resolveReview(item.id, "approved", "reviewer-1", "Looks good");
    expect(resolved?.status).toBe("approved");
    expect(resolved?.reviewerId).toBe("reviewer-1");
    expect(resolved?.reviewerNotes).toBe("Looks good");
  });

  it("returns undefined when resolving non-existent review", () => {
    const result = resolveReview("non-existent", "rejected", "reviewer-1");
    expect(result).toBeUndefined();
  });

  it("queryReviews filters by status", () => {
    submitForReview({ type: "check", decision: {} });
    const { items } = queryReviews({ status: "pending" });
    expect(items.every((i) => i.status === "pending")).toBe(true);
  });

  it("getReviewStats returns correct counts", () => {
    const stats = getReviewStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(typeof stats.pending).toBe("number");
    expect(typeof stats.approved).toBe("number");
    expect(typeof stats.avgReviewTimeMs).toBe("number");
  });
});
