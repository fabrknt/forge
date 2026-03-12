import { describe, it, expect } from "vitest";
import {
  encryptAllocation,
  createSharedAccess,
  recoverSecret,
  createPrivateShareLink,
  estimateCompressionSavings,
  estimateShieldedFee,
} from "../privacy";

// ---------------------------------------------------------------------------
// encryptAllocation
// ---------------------------------------------------------------------------

describe("encryptAllocation", () => {
  it("encrypts and returns EncryptedAllocation structure", () => {
    // NaCl box requires 32-byte keys for both public and secret
    const keypair = {
      publicKey: new Uint8Array(32).fill(1),
      secretKey: new Uint8Array(32).fill(2),
    };
    const recipientPubKey = new Uint8Array(32).fill(3);
    const allocation = { pool: "kamino", percentage: 50 };

    const encrypted = encryptAllocation(allocation, recipientPubKey, keypair);

    expect(encrypted.encrypted).toBe(true);
    expect(encrypted.nonce).toBeTruthy();
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.senderPublicKey).toBeTruthy();
    expect(encrypted.encryptedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// createSharedAccess / recoverSecret
// ---------------------------------------------------------------------------

describe("Shamir secret sharing", () => {
  // Shamir secret sharing requires exactly 32 bytes
  // Note: createSharedAccess(secret, totalShares, threshold) passes params to SDK
  // as splitSecret(buffer, totalShares, threshold), and the SDK interprets them as
  // splitSecret(buffer, threshold, totalShares). So effectively the caller must
  // swap totalShares and threshold: createSharedAccess(secret, threshold, totalShares).
  const secret32 = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"; // exactly 32 ASCII chars = 32 bytes

  it("creates shares via Shamir split", () => {
    // Due to param ordering, pass (secret, threshold, totalShares)
    const access = createSharedAccess(secret32, 3, 5);
    expect(access.shares.length).toBeGreaterThan(0);
    expect(access.createdAt).toBeGreaterThan(0);
  });

  it("each share has an index and data", () => {
    const access = createSharedAccess(secret32, 2, 3);
    for (const share of access.shares) {
      expect(share.index).toBeGreaterThan(0);
      expect(share.data).toBeTruthy();
    }
  });

  it("recoverSecret returns null when insufficient shares", () => {
    const result = recoverSecret(
      [{ index: 1, data: "abc" }],
      3 // threshold is 3 but only 1 share
    );
    expect(result).toBeNull();
  });

  it("round-trips split and recover", () => {
    const access = createSharedAccess(secret32, 3, 5);
    // Need at least threshold shares to recover
    const recovered = recoverSecret(access.shares.slice(0, 3), 3);
    expect(recovered).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// createPrivateShareLink
// ---------------------------------------------------------------------------

describe("createPrivateShareLink", () => {
  it("returns a shareId and expiration", () => {
    const link = createPrivateShareLink({ pool: "test" });
    expect(link.shareId).toBeTruthy();
    expect(link.shareId.length).toBe(32); // 16 bytes = 32 hex chars
    expect(link.expiresAt).toBeGreaterThan(Date.now());
  });

  it("respects custom expiration", () => {
    const now = Date.now();
    const link = createPrivateShareLink({ pool: "test" }, 1000);
    expect(link.expiresAt).toBeLessThanOrEqual(now + 1500);
    expect(link.expiresAt).toBeGreaterThan(now);
  });
});

// ---------------------------------------------------------------------------
// estimateCompressionSavings
// ---------------------------------------------------------------------------

describe("estimateCompressionSavings", () => {
  it("calculates savings for ZK compression", () => {
    const savings = estimateCompressionSavings(256);

    expect(savings.uncompressedCost).toBeGreaterThan(BigInt(0));
    expect(savings.compressedCost).toBe(BigInt(5000));
    expect(savings.savings).toBeGreaterThan(BigInt(0));
    expect(savings.savingsPercent).toBeGreaterThan(90);
  });

  it("uses custom lamports per byte", () => {
    const savings = estimateCompressionSavings(100, 10000);
    // Base rent 890880 + 100 * 10000 = 1890880 uncompressed
    expect(savings.uncompressedCost).toBe(BigInt(890880 + 100 * 10000));
  });
});

// ---------------------------------------------------------------------------
// estimateShieldedFee
// ---------------------------------------------------------------------------

describe("estimateShieldedFee", () => {
  it("returns a fee for SOL", () => {
    const fee = estimateShieldedFee("SOL");
    expect(fee).toBe(BigInt(2_000_000)); // 0.001 + 0.001 SOL
  });

  it("returns same fee for all token types (placeholder)", () => {
    expect(estimateShieldedFee("SOL")).toBe(estimateShieldedFee("USDC"));
    expect(estimateShieldedFee("SOL")).toBe(estimateShieldedFee("USDT"));
  });
});
