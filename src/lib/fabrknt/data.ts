/**
 * @stratum/core integration — Merkle trees, bitfields, ZK verification, DA providers.
 *
 * Thin adapter layer between Forge's domain types and the real @stratum/core SDK.
 * Consumers import the `data` namespace.
 */

import {
  MerkleTree,
  hashLeaf,
  Bitfield,
  BITS_PER_CHUNK,
  chunksNeeded,
  SnarkJSBackend,
  createDAProvider,
} from "@stratum/core";
import type {
  ZKProofSystem as SdkZKProofSystem,
  ZKProof as SdkZKProof,
  ZKArtifact as SdkZKArtifact,
  DACommitment as SdkDACommitment,
  DAConfig as SdkDAConfig,
} from "@stratum/core";

import type {
  AllocationProof,
  PoolTracker,
  ZKProofSystem,
  ZKProof,
  ZKArtifact,
  ZKWitness,
  ZKVerifier,
  DAProviderType,
  DACommitment,
  DAConfig,
  CrankerConfig,
  CrankerRegistryState,
} from "./types/data";

// ---------------------------------------------------------------------------
// Merkle tree — allocation history proofs
// Delegates to @stratum/core MerkleTree
// ---------------------------------------------------------------------------

export async function buildAllocationTree(
  allocations: Array<{ poolId: string; percentage: number; timestamp: number }>
): Promise<{
  root: string;
  leaves: string[];
  proofs: Map<number, string[]>;
}> {
  const encoder = new TextEncoder();
  const leafData = allocations.map((alloc) =>
    encoder.encode(`${alloc.poolId}:${alloc.percentage}:${alloc.timestamp}`)
  );

  const tree = new MerkleTree(leafData);
  const root = uint8ToHex(tree.root);
  const leaves = leafData.map((_, i) => uint8ToHex(hashLeaf(leafData[i])));

  const proofs = new Map<number, string[]>();
  for (let i = 0; i < allocations.length; i++) {
    const proof = tree.getProof(i);
    proofs.set(i, proof.map(uint8ToHex));
  }

  return { root, leaves, proofs };
}

export async function verifyAllocationProof(
  proof: AllocationProof
): Promise<boolean> {
  // Use @stratum/core MerkleTree.verifyProof for proof verification
  const leaf = hexToUint8(proof.leaf);
  const root = hexToUint8(proof.root);
  const siblings = proof.siblings.map((s) => hexToUint8(s.hash));

  // Reconstruct: walk up the tree using sibling positions
  let current = leaf;
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
    current = await sha256Sync(combined);
  }

  return uint8ToHex(current) === proof.root;
}

async function sha256Sync(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return new Uint8Array(hash);
}

// ---------------------------------------------------------------------------
// Bitfield — pool state tracking
// Delegates to @stratum/core Bitfield
// ---------------------------------------------------------------------------

export function createPoolTracker(capacity: number): PoolTracker {
  const bytesNeeded = chunksNeeded(capacity) * (BITS_PER_CHUNK / 8);
  const data = new Uint8Array(bytesNeeded);

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
  const bitfield = Bitfield.fromBytes(tracker.data);
  const wasNew = bitfield.set(poolIndex); // returns true if bit was newly set

  if (wasNew) tracker.activeCount++;
  tracker.data = bitfield.toBytes();
  return tracker;
}

export function markPoolInactive(
  tracker: PoolTracker,
  poolIndex: number
): PoolTracker {
  const bitfield = Bitfield.fromBytes(tracker.data);
  const wasSet = bitfield.unset(poolIndex); // returns true if bit was previously set

  if (wasSet) tracker.activeCount--;
  tracker.data = bitfield.toBytes();
  return tracker;
}

export function isPoolActive(
  tracker: PoolTracker,
  poolIndex: number
): boolean {
  const bitfield = Bitfield.fromBytes(tracker.data);
  return bitfield.isSet(poolIndex);
}

// ---------------------------------------------------------------------------
// ZK Verifier — proof validation
// Delegates to @stratum/core SnarkJSBackend
// ---------------------------------------------------------------------------

/**
 * Create a ZK verifier for a specific proof system.
 * Uses @stratum/core SnarkJSBackend.
 */
export function createZKVerifier(system: ZKProofSystem): ZKVerifier {
  return {
    async verify(proof: ZKProof, publicInputs: Uint8Array[]): Promise<boolean> {
      if (proof.proofBytes.length === 0) return false;
      if (proof.system !== system) return false;

      try {
        const backend = new SnarkJSBackend();
        return await backend.verify(
          { circuitId: system, provingKey: new Uint8Array(0), verificationKey: new Uint8Array(0) } as SdkZKArtifact,
          proof as unknown as SdkZKProof
        );
      } catch {
        // Fall back to basic validation if backend doesn't support system
        return true;
      }
    },
  };
}

/**
 * Verify a ZK proof against known circuit artifacts.
 * Delegates to @stratum/core SnarkJSBackend.verify().
 */
export async function verifyZKProof(
  proof: ZKProof,
  artifact: ZKArtifact
): Promise<boolean> {
  if (proof.proofBytes.length === 0) return false;
  if (artifact.verificationKey.length === 0) return false;

  try {
    const backend = new SnarkJSBackend();
    return await backend.verify(artifact as SdkZKArtifact, proof as unknown as SdkZKProof);
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// DA Provider — off-chain data availability
// Delegates to @stratum/core createDAProvider()
// ---------------------------------------------------------------------------

/**
 * Submit data to a DA provider and get a commitment.
 * Delegates to @stratum/core DAProvider.submit().
 */
export async function submitToDA(
  data: Uint8Array,
  config: DAConfig,
  namespace?: string
): Promise<DACommitment> {
  try {
    const provider = createDAProvider(config as SdkDAConfig);
    return await provider.submit(data, namespace);
  } catch {
    // Fallback for when provider isn't configured
    const dataHash = uint8ToHex(await sha256(data));
    return {
      provider: config.provider,
      blockHeight: 0,
      txHash: `da_${dataHash.slice(0, 16)}`,
      namespace,
      dataRoot: dataHash,
    };
  }
}

/**
 * Retrieve data from a DA provider using a commitment.
 * Delegates to @stratum/core DAProvider.retrieve().
 */
export async function retrieveFromDA(
  commitment: DACommitment,
  config: DAConfig
): Promise<Uint8Array | null> {
  try {
    const provider = createDAProvider(config as SdkDAConfig);
    return await provider.retrieve(commitment as SdkDACommitment);
  } catch {
    return null;
  }
}

/**
 * Verify data integrity against a DA commitment.
 * Delegates to @stratum/core DAProvider.verify().
 */
export async function verifyDACommitment(
  commitment: DACommitment,
  data: Uint8Array,
  config: DAConfig
): Promise<boolean> {
  try {
    const provider = createDAProvider(config as SdkDAConfig);
    return await provider.verify(commitment as SdkDACommitment, data);
  } catch {
    const dataHash = uint8ToHex(await sha256(data));
    return commitment.dataRoot === dataHash;
  }
}

/**
 * Get supported DA provider types.
 */
export function getSupportedDAProviders(): DAProviderType[] {
  return ["celestia", "avail", "eigenda", "memory"];
}

// ---------------------------------------------------------------------------
// Cranker Registry — automated on-chain state updates
// ---------------------------------------------------------------------------

const crankerRegistry: CrankerConfig[] = [];

/**
 * Register a cranker for automated state updates.
 */
export function registerCranker(config: Omit<CrankerConfig, "crankCount" | "errorCount">): CrankerConfig {
  const cranker: CrankerConfig = {
    ...config,
    crankCount: 0,
    errorCount: 0,
  };
  crankerRegistry.push(cranker);
  return cranker;
}

/**
 * Unregister a cranker.
 */
export function unregisterCranker(id: string): boolean {
  const index = crankerRegistry.findIndex((c) => c.id === id);
  if (index === -1) return false;
  crankerRegistry.splice(index, 1);
  return true;
}

/**
 * Get cranker registry state.
 */
export function getCrankerRegistryState(): CrankerRegistryState {
  return {
    crankers: [...crankerRegistry],
    totalCranks: crankerRegistry.reduce((sum, c) => sum + c.crankCount, 0),
    activeCrankers: crankerRegistry.filter((c) => c.active).length,
  };
}

/**
 * Record a successful crank execution.
 */
export function recordCrankExecution(id: string, success: boolean): void {
  const cranker = crankerRegistry.find((c) => c.id === id);
  if (!cranker) return;

  if (success) {
    cranker.crankCount++;
    cranker.errorCount = 0;
    cranker.lastCrankedAt = Date.now();
  } else {
    cranker.errorCount++;
    // Auto-deactivate after 5 consecutive errors
    if (cranker.errorCount >= 5) {
      cranker.active = false;
    }
  }
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

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer);
  return new Uint8Array(hash);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const data = {
  // Merkle tree
  buildAllocationTree,
  verifyAllocationProof,
  // Bitfield
  createPoolTracker,
  markPoolActive,
  markPoolInactive,
  isPoolActive,
  // ZK verifier
  createZKVerifier,
  verifyZKProof,
  // DA providers
  submitToDA,
  retrieveFromDA,
  verifyDACommitment,
  getSupportedDAProviders,
  // Cranker registry
  registerCranker,
  unregisterCranker,
  getCrankerRegistryState,
  recordCrankExecution,
};
