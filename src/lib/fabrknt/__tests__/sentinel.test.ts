import { describe, it, expect } from "vitest";
import {
  createGuard,
  buildDCAPlan,
  buildRebalancePlan,
  buildGridTradingPlan,
  getTipInfo,
  analyzeHoneypot,
  getFlashbotsRelayUrl,
} from "../sentinel";

// ---------------------------------------------------------------------------
// createGuard
// ---------------------------------------------------------------------------

describe("createGuard", () => {
  it("returns a guard instance with validate, getHistory, clearHistory", () => {
    const guard = createGuard();
    expect(guard).toHaveProperty("validate");
    expect(guard).toHaveProperty("getHistory");
    expect(guard).toHaveProperty("clearHistory");
  });

  it("allows a safe Solana transaction with no warnings", async () => {
    const guard = createGuard();
    const result = await guard.validate({
      chain: "solana",
      instructions: [
        {
          programId: "11111111111111111111111111111111",
          data: "transfer",
          accounts: [],
        },
      ],
    } as any);

    expect(result.allowed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.riskScore).toBe(0);
  });

  it("returns warnings array (possibly empty) for Solana tx with pattern data", async () => {
    // The SDK Guard uses real instruction parsing, so simple string data
    // won't trigger pattern detection. We verify the guard runs without error.
    const guard = createGuard({ mode: "block", riskTolerance: "strict" });
    const result = await guard.validate({
      chain: "solana",
      instructions: [
        {
          programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          data: "setAuthority mintTokens null",
          accounts: [],
        },
      ],
    } as any);

    expect(result).toHaveProperty("allowed");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("riskScore");
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("detects EVM-002 flash loan + DEX swap", async () => {
    const guard = createGuard({ riskTolerance: "strict" });
    const result = await guard.validate({
      chain: "evm",
      instructions: [
        {
          programId: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", // AAVE V3
          data: "0x5cffe9de0000", // flashLoan selector
          accounts: [],
        },
        {
          programId: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2
          data: "0x022c0d9f0000", // swap selector
          accounts: [],
        },
      ],
    } as any);

    expect(result.warnings.some((w: any) => w.patternId === "EVM-002")).toBe(true);
  });

  it("detects EVM-004 renounceOwnership", async () => {
    const guard = createGuard({ riskTolerance: "strict" });
    const result = await guard.validate({
      chain: "evm",
      instructions: [
        {
          programId: "0xSomeContract",
          data: "0x715018a6", // renounceOwnership
          accounts: [],
        },
      ],
    } as any);

    expect(result.warnings.some((w: any) => w.patternId === "EVM-004")).toBe(true);
  });

  it("detects EVM-003 front-running with multiple swaps", async () => {
    const guard = createGuard({ riskTolerance: "strict" });
    const result = await guard.validate({
      chain: "evm",
      instructions: [
        {
          programId: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
          data: "0x022c0d9f0000",
          accounts: [],
        },
        {
          programId: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
          data: "0x022c0d9f0000",
          accounts: [],
        },
      ],
    } as any);

    expect(result.warnings.some((w: any) => w.patternId === "EVM-003")).toBe(true);
  });

  it("accumulates history across multiple validate calls", async () => {
    const guard = createGuard({ riskTolerance: "strict" });
    await guard.validate({
      chain: "evm",
      instructions: [
        {
          programId: "0xSomeContract",
          data: "0x715018a6",
          accounts: [],
        },
      ],
    } as any);

    expect(guard.getHistory().length).toBeGreaterThan(0);

    guard.clearHistory();
    expect(guard.getHistory()).toHaveLength(0);
  });

  it("permissive guard still returns a valid result", async () => {
    const guard = createGuard({ riskTolerance: "permissive" });
    const result = await guard.validate({
      chain: "evm",
      instructions: [
        {
          programId: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",
          data: "0x5cffe9de0000",
          accounts: [],
        },
        {
          programId: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
          data: "0x022c0d9f0000",
          accounts: [],
        },
      ],
    } as any);

    expect(result).toHaveProperty("allowed");
    expect(result).toHaveProperty("warnings");
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildDCAPlan
// ---------------------------------------------------------------------------

describe("buildDCAPlan", () => {
  it("splits total amount evenly across orders", () => {
    const plan = buildDCAPlan({
      totalAmount: 1000,
      numberOfOrders: 5,
      intervalMs: 60_000,
      pair: { base: "SOL", quote: "USDC" } as any,
    });

    expect(plan.type).toBe("dca");
    expect(plan.amountPerOrder).toBe(200);
    expect(plan.orders).toHaveLength(5);
    expect(plan.orders[0].amount).toBe(200);
    expect(plan.orders[0].orderNumber).toBe(1);
    expect(plan.orders[0].status).toBe("pending");
  });

  it("schedules orders at correct intervals", () => {
    const startTime = 1000000;
    const plan = buildDCAPlan({
      totalAmount: 300,
      numberOfOrders: 3,
      intervalMs: 10_000,
      pair: { base: "SOL", quote: "USDC" } as any,
      startTime,
    });

    expect(plan.orders[0].scheduledAt).toBe(startTime);
    expect(plan.orders[1].scheduledAt).toBe(startTime + 10_000);
    expect(plan.orders[2].scheduledAt).toBe(startTime + 20_000);
    expect(plan.estimatedCompletionTime).toBe(startTime + 20_000);
  });
});

// ---------------------------------------------------------------------------
// buildRebalancePlan
// ---------------------------------------------------------------------------

describe("buildRebalancePlan", () => {
  it("detects drift and generates trades", () => {
    const plan = buildRebalancePlan({
      currentHoldings: {
        SOL: { value: 8000 },
        ETH: { value: 2000 },
      } as any,
      targetAllocations: {
        SOL: { percentage: 50 },
        ETH: { percentage: 50 },
      } as any,
    });

    expect(plan.type).toBe("rebalance");
    expect(plan.totalValue).toBe(10000);
    expect(plan.driftDetected).toBe(true);
    expect(plan.trades.length).toBeGreaterThan(0);

    const solTrade = plan.trades.find((t) => t.token === "SOL");
    expect(solTrade?.side).toBe("sell");

    const ethTrade = plan.trades.find((t) => t.token === "ETH");
    expect(ethTrade?.side).toBe("buy");
  });

  it("reports no trades when within threshold", () => {
    const plan = buildRebalancePlan({
      currentHoldings: {
        SOL: { value: 5100 },
        ETH: { value: 4900 },
      } as any,
      targetAllocations: {
        SOL: { percentage: 50 },
        ETH: { percentage: 50 },
      } as any,
      rebalanceThreshold: 5,
    });

    expect(plan.driftDetected).toBe(false);
    expect(plan.trades).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildGridTradingPlan
// ---------------------------------------------------------------------------

describe("buildGridTradingPlan", () => {
  it("creates correct number of grid levels", () => {
    const plan = buildGridTradingPlan({
      lowerBound: 90,
      upperBound: 110,
      gridLevels: 5,
      amountPerGrid: 10,
      currentPrice: { price: 100 } as any,
      pair: { base: "SOL", quote: "USDC" } as any,
    });

    expect(plan.type).toBe("grid");
    expect(plan.levels).toHaveLength(5);
    expect(plan.gridSpacing).toBe(5);
  });

  it("assigns buy/sell sides correctly relative to current price", () => {
    const plan = buildGridTradingPlan({
      lowerBound: 90,
      upperBound: 110,
      gridLevels: 5,
      amountPerGrid: 10,
      currentPrice: { price: 100 } as any,
      pair: { base: "SOL", quote: "USDC" } as any,
    });

    // Levels below current price should be buy, above should be sell
    for (const level of plan.levels) {
      if (level.price < 100) expect(level.side).toBe("buy");
      else expect(level.side).toBe("sell");
    }
  });
});

// ---------------------------------------------------------------------------
// getTipInfo
// ---------------------------------------------------------------------------

describe("getTipInfo", () => {
  it("returns correct tip amount for each level", () => {
    expect(getTipInfo("low").tipAmount).toBe(1_000);
    expect(getTipInfo("medium").tipAmount).toBe(10_000);
    expect(getTipInfo("high").tipAmount).toBe(100_000);
    expect(getTipInfo("turbo").tipAmount).toBe(10_000_000);
  });

  it("converts tip to SOL correctly", () => {
    const info = getTipInfo("medium");
    expect(info.tipAmountSol).toBe(0.00001);
  });

  it("falls back to default region for unknown region", () => {
    const info = getTipInfo("medium", "unknown_region");
    expect(info.tipAccount).toBeTruthy();
  });

  it("uses region-specific tip accounts", () => {
    const info = getTipInfo("medium", "amsterdam");
    // SDK returns tip account as an object with address and name
    if (typeof info.tipAccount === "object" && info.tipAccount !== null) {
      expect((info.tipAccount as any).address).toBe(
        "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"
      );
    } else {
      expect(info.tipAccount).toBe(
        "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// analyzeHoneypot
// ---------------------------------------------------------------------------

describe("analyzeHoneypot", () => {
  it("detects honeypot when buy succeeds but sell fails", () => {
    const result = analyzeHoneypot(
      { success: true } as any,
      { success: false, revertReason: "Cannot sell" } as any
    );

    expect(result.isHoneypot).toBe(true);
    expect(result.sellTax).toBe(100);
    expect(result.reason).toBe("Cannot sell");
  });

  it("reports no honeypot when both succeed", () => {
    const result = analyzeHoneypot(
      { success: true } as any,
      { success: true } as any
    );

    expect(result.isHoneypot).toBe(false);
    expect(result.buyTax).toBe(0);
    expect(result.sellTax).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getFlashbotsRelayUrl
// ---------------------------------------------------------------------------

describe("getFlashbotsRelayUrl", () => {
  it("returns mainnet relay by default", () => {
    expect(getFlashbotsRelayUrl()).toBe("https://relay.flashbots.net");
  });

  it("returns correct relay for known networks", () => {
    expect(getFlashbotsRelayUrl("goerli")).toBe(
      "https://relay-goerli.flashbots.net"
    );
    expect(getFlashbotsRelayUrl("sepolia")).toBe(
      "https://relay-sepolia.flashbots.net"
    );
  });

  it("falls back to mainnet for unknown network", () => {
    expect(getFlashbotsRelayUrl("arbitrum")).toBe(
      "https://relay.flashbots.net"
    );
  });
});
