import { describe, it, expect, beforeEach } from "vitest";
import {
  buildAllocationTree,
  createPoolTracker,
  markPoolActive,
  markPoolInactive,
  isPoolActive,
  createZKVerifier,
  verifyZKProof,
  getSupportedDAProviders,
  registerCranker,
  unregisterCranker,
  getCrankerRegistryState,
  recordCrankExecution,
} from "../data";

// ---------------------------------------------------------------------------
// buildAllocationTree
// ---------------------------------------------------------------------------

describe("buildAllocationTree", () => {
  it("builds a merkle tree with correct number of leaves", async () => {
    const allocations = [
      { poolId: "pool-1", percentage: 50, timestamp: 1000 },
      { poolId: "pool-2", percentage: 30, timestamp: 1000 },
      { poolId: "pool-3", percentage: 20, timestamp: 1000 },
    ];

    const tree = await buildAllocationTree(allocations);
    expect(tree.leaves).toHaveLength(3);
    expect(tree.root).toBeTruthy();
    expect(tree.root.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it("produces a deterministic root for same inputs", async () => {
    const allocations = [
      { poolId: "pool-1", percentage: 50, timestamp: 1000 },
      { poolId: "pool-2", percentage: 50, timestamp: 1000 },
    ];

    const tree1 = await buildAllocationTree(allocations);
    const tree2 = await buildAllocationTree(allocations);
    expect(tree1.root).toBe(tree2.root);
  });

  it("produces different roots for different inputs", async () => {
    const tree1 = await buildAllocationTree([
      { poolId: "pool-1", percentage: 50, timestamp: 1000 },
    ]);
    const tree2 = await buildAllocationTree([
      { poolId: "pool-2", percentage: 50, timestamp: 1000 },
    ]);
    expect(tree1.root).not.toBe(tree2.root);
  });

  it("handles single allocation", async () => {
    const tree = await buildAllocationTree([
      { poolId: "pool-1", percentage: 100, timestamp: 1000 },
    ]);
    expect(tree.leaves).toHaveLength(1);
    expect(tree.root).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Pool tracker (bitfield)
// ---------------------------------------------------------------------------

describe("pool tracker", () => {
  it("creates a tracker with correct capacity", () => {
    const tracker = createPoolTracker(100);
    expect(tracker.capacity).toBe(100);
    expect(tracker.activeCount).toBe(0);
  });

  it("marks pools active and tracks count", () => {
    let tracker = createPoolTracker(100);
    tracker = markPoolActive(tracker, 0);
    tracker = markPoolActive(tracker, 5);
    tracker = markPoolActive(tracker, 10);

    expect(tracker.activeCount).toBe(3);
    expect(isPoolActive(tracker, 0)).toBe(true);
    expect(isPoolActive(tracker, 5)).toBe(true);
    expect(isPoolActive(tracker, 10)).toBe(true);
    expect(isPoolActive(tracker, 1)).toBe(false);
  });

  it("marks pools inactive", () => {
    let tracker = createPoolTracker(100);
    tracker = markPoolActive(tracker, 5);
    expect(isPoolActive(tracker, 5)).toBe(true);
    expect(tracker.activeCount).toBe(1);

    tracker = markPoolInactive(tracker, 5);
    expect(isPoolActive(tracker, 5)).toBe(false);
    expect(tracker.activeCount).toBe(0);
  });

  it("does not double-count activating an already active pool", () => {
    let tracker = createPoolTracker(100);
    tracker = markPoolActive(tracker, 3);
    tracker = markPoolActive(tracker, 3);
    expect(tracker.activeCount).toBe(1);
  });

  it("does not double-count deactivating an already inactive pool", () => {
    let tracker = createPoolTracker(100);
    tracker = markPoolInactive(tracker, 3);
    expect(tracker.activeCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ZK Verifier
// ---------------------------------------------------------------------------

describe("createZKVerifier", () => {
  it("rejects empty proof bytes", async () => {
    const verifier = createZKVerifier("groth16");
    const result = await verifier.verify(
      { proofBytes: new Uint8Array(0), system: "groth16" } as any,
      []
    );
    expect(result).toBe(false);
  });

  it("rejects mismatched proof system", async () => {
    const verifier = createZKVerifier("groth16");
    const result = await verifier.verify(
      { proofBytes: new Uint8Array(32).fill(1), system: "plonk" } as any,
      []
    );
    expect(result).toBe(false);
  });

  it("accepts valid proof (placeholder)", async () => {
    const verifier = createZKVerifier("groth16");
    const result = await verifier.verify(
      { proofBytes: new Uint8Array(32).fill(1), system: "groth16" } as any,
      []
    );
    expect(result).toBe(true);
  });
});

describe("verifyZKProof", () => {
  it("rejects empty verification key", async () => {
    const result = await verifyZKProof(
      { proofBytes: new Uint8Array(32).fill(1) } as any,
      { verificationKey: new Uint8Array(0) } as any
    );
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DA Providers
// ---------------------------------------------------------------------------

describe("getSupportedDAProviders", () => {
  it("returns expected provider types", () => {
    const providers = getSupportedDAProviders();
    expect(providers).toContain("celestia");
    expect(providers).toContain("avail");
    expect(providers).toContain("eigenda");
    expect(providers).toContain("memory");
  });
});

// ---------------------------------------------------------------------------
// Cranker Registry
// ---------------------------------------------------------------------------

describe("cranker registry", () => {
  it("registers and retrieves a cranker", () => {
    const cranker = registerCranker({
      id: "test-cranker-1",
      name: "Test Cranker",
      active: true,
      intervalMs: 5000,
    } as any);

    expect(cranker.id).toBe("test-cranker-1");
    expect(cranker.crankCount).toBe(0);
    expect(cranker.errorCount).toBe(0);

    const state = getCrankerRegistryState();
    expect(state.crankers.some((c) => c.id === "test-cranker-1")).toBe(true);
  });

  it("unregisters a cranker", () => {
    registerCranker({
      id: "to-remove",
      name: "Remove Me",
      active: true,
      intervalMs: 1000,
    } as any);

    expect(unregisterCranker("to-remove")).toBe(true);
    expect(unregisterCranker("non-existent")).toBe(false);
  });

  it("records successful crank executions", () => {
    registerCranker({
      id: "crank-counter",
      name: "Counter",
      active: true,
      intervalMs: 1000,
    } as any);

    recordCrankExecution("crank-counter", true);
    recordCrankExecution("crank-counter", true);

    const state = getCrankerRegistryState();
    const cranker = state.crankers.find((c) => c.id === "crank-counter");
    expect(cranker?.crankCount).toBe(2);
    expect(cranker?.lastCrankedAt).toBeGreaterThan(0);
  });

  it("auto-deactivates after 5 consecutive errors", () => {
    registerCranker({
      id: "error-cranker",
      name: "Error",
      active: true,
      intervalMs: 1000,
    } as any);

    for (let i = 0; i < 5; i++) {
      recordCrankExecution("error-cranker", false);
    }

    const state = getCrankerRegistryState();
    const cranker = state.crankers.find((c) => c.id === "error-cranker");
    expect(cranker?.active).toBe(false);
    expect(cranker?.errorCount).toBe(5);
  });

  it("resets error count on success", () => {
    registerCranker({
      id: "reset-cranker",
      name: "Reset",
      active: true,
      intervalMs: 1000,
    } as any);

    recordCrankExecution("reset-cranker", false);
    recordCrankExecution("reset-cranker", false);
    recordCrankExecution("reset-cranker", true); // reset errors

    const state = getCrankerRegistryState();
    const cranker = state.crankers.find((c) => c.id === "reset-cranker");
    expect(cranker?.errorCount).toBe(0);
    expect(cranker?.crankCount).toBe(1);
  });
});
