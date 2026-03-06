/**
 * @stratum/core integration — Merkle trees and bitfields.
 *
 * Usage in Forge:
 * - Merkle tree for verifiable allocation history proofs
 * - Bitfield for efficient pool state tracking (active/inactive/watched)
 */

import type { AllocationProof, PoolTracker } from "./types/data";

// ---------------------------------------------------------------------------
// Merkle tree — allocation history proofs
// ---------------------------------------------------------------------------

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return new Uint8Array(hash);
}

export async function buildAllocationTree(
  allocations: Array<{ poolId: string; percentage: number; timestamp: number }>
): Promise<{
  root: string;
  leaves: string[];
  proofs: Map<number, string[]>;
}> {
  // In production: uses @stratum/core MerkleTree
  // const tree = new MerkleTree(leaves, hashFn)

  const encoder = new TextEncoder();
  const leaves: string[] = [];

  for (const alloc of allocations) {
    const data = encoder.encode(
      `${alloc.poolId}:${alloc.percentage}:${alloc.timestamp}`
    );
    const hash = await sha256(data);
    leaves.push(uint8ToHex(hash));
  }

  // Build tree bottom-up
  let layer = leaves.map((l) => hexToUint8(l));

  while (layer.length > 1) {
    const nextLayer: Uint8Array[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? layer[i]; // duplicate if odd
      const combined = new Uint8Array(left.length + right.length);
      combined.set(left);
      combined.set(right, left.length);
      nextLayer.push(await sha256(combined));
    }
    layer = nextLayer;
  }

  const root = uint8ToHex(layer[0]);

  return { root, leaves, proofs: new Map() };
}

export async function verifyAllocationProof(
  proof: AllocationProof
): Promise<boolean> {
  // In production: uses MerkleTree.verify(proof, root)
  // Verifies that a specific allocation was part of the committed set

  let current = hexToUint8(proof.leaf);

  for (const sibling of proof.siblings) {
    const siblingBytes = hexToUint8(sibling.hash);
    const combined = new Uint8Array(current.length + siblingBytes.length);

    if (sibling.position === "left") {
      combined.set(siblingBytes);
      combined.set(current, siblingBytes.length);
    } else {
      combined.set(current);
      combined.set(siblingBytes, current.length);
    }

    current = await sha256(combined);
  }

  return uint8ToHex(current) === proof.root;
}

// ---------------------------------------------------------------------------
// Bitfield — pool state tracking
// ---------------------------------------------------------------------------

const BITS_PER_CHUNK = 256;

export function createPoolTracker(capacity: number): PoolTracker {
  // In production: uses @stratum/core Bitfield
  const chunks = Math.ceil(capacity / BITS_PER_CHUNK);
  const data = new Uint8Array(chunks * 32); // 32 bytes per chunk

  return {
    capacity,
    data,
    activeCount: 0,
  };
}

export function markPoolActive(
  tracker: PoolTracker,
  poolIndex: number
): PoolTracker {
  const byteIndex = Math.floor(poolIndex / 8);
  const bitIndex = poolIndex % 8;

  const wasActive = (tracker.data[byteIndex] & (1 << bitIndex)) !== 0;
  tracker.data[byteIndex] |= 1 << bitIndex;

  if (!wasActive) tracker.activeCount++;
  return tracker;
}

export function markPoolInactive(
  tracker: PoolTracker,
  poolIndex: number
): PoolTracker {
  const byteIndex = Math.floor(poolIndex / 8);
  const bitIndex = poolIndex % 8;

  const wasActive = (tracker.data[byteIndex] & (1 << bitIndex)) !== 0;
  tracker.data[byteIndex] &= ~(1 << bitIndex);

  if (wasActive) tracker.activeCount--;
  return tracker;
}

export function isPoolActive(
  tracker: PoolTracker,
  poolIndex: number
): boolean {
  const byteIndex = Math.floor(poolIndex / 8);
  const bitIndex = poolIndex % 8;
  return (tracker.data[byteIndex] & (1 << bitIndex)) !== 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const data = {
  buildAllocationTree,
  verifyAllocationProof,
  createPoolTracker,
  markPoolActive,
  markPoolInactive,
  isPoolActive,
};
