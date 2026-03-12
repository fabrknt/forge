import { describe, it, expect } from "vitest";
import {
  verifyIdentity,
  requestVerification,
  isAllowedForPool,
  isBlacklisted,
  canAccessFeature,
  registerKycProvider,
  getKycProviders,
} from "../identity";

// ---------------------------------------------------------------------------
// verifyIdentity
// ---------------------------------------------------------------------------

describe("verifyIdentity", () => {
  it("returns default none/not_found for internal provider", async () => {
    const result = await verifyIdentity("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV");
    expect(result.wallet).toBe("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV");
    expect(result.kycLevel).toBe("none");
    expect(result.whitelistStatus).toBe("not_found");
    expect(result.provider).toBe("internal");
  });

  it("routes to civic provider", async () => {
    const result = await verifyIdentity("someWallet", { provider: "civic" });
    expect(result.provider).toBe("civic");
    expect(result.kycLevel).toBe("none");
  });

  it("routes to world_id provider", async () => {
    const result = await verifyIdentity("someWallet", { provider: "world_id" });
    expect(result.provider).toBe("world_id");
  });
});

// ---------------------------------------------------------------------------
// requestVerification
// ---------------------------------------------------------------------------

describe("requestVerification", () => {
  it("returns a pending verification response", async () => {
    const result = await requestVerification({
      wallet: "testWallet",
      provider: "internal",
      requestedLevel: "basic",
    } as any);

    expect(result.status).toBe("pending");
    expect(result.provider).toBe("internal");
    expect(result.wallet).toBe("testWallet");
  });
});

// ---------------------------------------------------------------------------
// isAllowedForPool
// ---------------------------------------------------------------------------

describe("isAllowedForPool", () => {
  it("allows when verification level meets requirement", () => {
    const verification = {
      kycLevel: "standard",
    } as any;

    expect(isAllowedForPool(verification, "basic")).toBe(true);
    expect(isAllowedForPool(verification, "standard")).toBe(true);
  });

  it("rejects when verification level is below requirement", () => {
    const verification = {
      kycLevel: "basic",
    } as any;

    expect(isAllowedForPool(verification, "enhanced")).toBe(false);
    expect(isAllowedForPool(verification, "institutional")).toBe(false);
  });

  it("allows none level for none requirement", () => {
    const verification = { kycLevel: "none" } as any;
    expect(isAllowedForPool(verification, "none")).toBe(true);
  });

  it("institutional level passes all checks", () => {
    const verification = { kycLevel: "institutional" } as any;
    expect(isAllowedForPool(verification, "none")).toBe(true);
    expect(isAllowedForPool(verification, "basic")).toBe(true);
    expect(isAllowedForPool(verification, "standard")).toBe(true);
    expect(isAllowedForPool(verification, "enhanced")).toBe(true);
    expect(isAllowedForPool(verification, "institutional")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isBlacklisted
// ---------------------------------------------------------------------------

describe("isBlacklisted", () => {
  it("returns false for placeholder implementation", async () => {
    const result = await isBlacklisted("anyAddress");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canAccessFeature
// ---------------------------------------------------------------------------

describe("canAccessFeature", () => {
  it("allows paper-trading for unverified users", () => {
    const v = { kycLevel: "none" } as any;
    expect(canAccessFeature(v, "paper-trading")).toBe(true);
    expect(canAccessFeature(v, "explore-pools")).toBe(true);
    expect(canAccessFeature(v, "ai-recommendations")).toBe(true);
  });

  it("requires basic for execute-allocation", () => {
    const basic = { kycLevel: "basic" } as any;
    const standard = { kycLevel: "standard" } as any;
    expect(canAccessFeature(basic, "execute-allocation")).toBe(true);
    expect(canAccessFeature(standard, "execute-allocation")).toBe(true);
  });

  it("requires standard for morpho-vaults", () => {
    const basic = { kycLevel: "basic" } as any;
    const standard = { kycLevel: "standard" } as any;
    expect(canAccessFeature(basic, "morpho-vaults")).toBe(false);
    expect(canAccessFeature(standard, "morpho-vaults")).toBe(true);
  });

  it("requires enhanced for create-listing", () => {
    const standard = { kycLevel: "standard" } as any;
    const enhanced = { kycLevel: "enhanced" } as any;
    expect(canAccessFeature(standard, "create-listing")).toBe(false);
    expect(canAccessFeature(enhanced, "create-listing")).toBe(true);
  });

  it("requires institutional for institutional-api", () => {
    const enhanced = { kycLevel: "enhanced" } as any;
    const institutional = { kycLevel: "institutional" } as any;
    expect(canAccessFeature(enhanced, "institutional-api")).toBe(false);
    expect(canAccessFeature(institutional, "institutional-api")).toBe(true);
  });

  it("defaults to none for unknown features", () => {
    const none = { kycLevel: "none" } as any;
    expect(canAccessFeature(none, "unknown-feature")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// KYC providers
// ---------------------------------------------------------------------------

describe("KYC provider registry", () => {
  it("has internal provider by default", () => {
    const providers = getKycProviders();
    expect(providers.some((p) => p.provider === "internal")).toBe(true);
  });

  it("registers a new provider", () => {
    registerKycProvider({
      provider: "civic",
      enabled: true,
    } as any);

    const providers = getKycProviders();
    expect(providers.some((p) => p.provider === "civic")).toBe(true);
  });
});
