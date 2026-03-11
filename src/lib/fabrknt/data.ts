/**
 * @stratum/core integration — Merkle trees, bitfields, ZK verification, DA providers.
 *
 * Usage in Forge:
 * - Merkle tree for verifiable allocation history proofs
 * - Bitfield for efficient pool state tracking (active/inactive/watched)
 * - ZK verifier for proof validation (Groth16, PlonK, STARK)
 * - DA provider config for off-chain data availability
 * - Cranker registry for automated on-chain state updates
 */

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
// In production: uses @stratum/core MerkleTree
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
// In production: uses @stratum/core Bitfield
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
// ZK Verifier — proof validation
// In production: uses @stratum/core ZKCircuit / ZKBackend / SnarkJSBackend
// ---------------------------------------------------------------------------

/**
 * Create a ZK verifier for a specific proof system.
 * In production: uses @stratum/core SnarkJSBackend or custom ZKBackend.
 */
export function createZKVerifier(system: ZKProofSystem): ZKVerifier {
  return {
    async verify(proof: ZKProof, publicInputs: Uint8Array[]): Promise<boolean> {
      // In production: routes to appropriate backend
      // const backend = new SnarkJSBackend();
      // return backend.verify(artifact, proof);

      if (proof.proofBytes.length === 0) return false;
      if (proof.system !== system) return false;

      // Placeholder — actual verification depends on circuit artifacts
      return true;
    },
  };
}

/**
 * Verify a ZK proof against known circuit artifacts.
 * In production: uses @stratum/core ZKBackend.verify()
 */
export async function verifyZKProof(
  proof: ZKProof,
  artifact: ZKArtifact
): Promise<boolean> {
  // In production: const backend = new SnarkJSBackend();
  // return backend.verify(artifact, proof);

  if (proof.proofBytes.length === 0) return false;
  if (artifact.verificationKey.length === 0) return false;

  // Placeholder
  return true;
}

// ---------------------------------------------------------------------------
// DA Provider — off-chain data availability
// In production: uses @stratum/core createDAProvider()
// ---------------------------------------------------------------------------

/**
 * Submit data to a DA provider and get a commitment.
 * In production: uses @stratum/core DAProvider.submit()
 */
export async function submitToDA(
  data: Uint8Array,
  config: DAConfig,
  namespace?: string
): Promise<DACommitment> {
  // In production:
  // const provider = createDAProvider(config);
  // return provider.submit(data, namespace);

  const dataHash = uint8ToHex(await sha256(data));

  return {
    provider: config.provider,
    blockHeight: 0,
    txHash: `da_${dataHash.slice(0, 16)}`,
    namespace,
    dataRoot: dataHash,
  };
}

/**
 * Retrieve data from a DA provider using a commitment.
 * In production: uses @stratum/core DAProvider.retrieve()
 */
export async function retrieveFromDA(
  commitment: DACommitment,
  config: DAConfig
): Promise<Uint8Array | null> {
  // In production:
  // const provider = createDAProvider(config);
  // return provider.retrieve(commitment);

  return null; // placeholder
}

/**
 * Verify data integrity against a DA commitment.
 * In production: uses @stratum/core DAProvider.verify()
 */
export async function verifyDACommitment(
  commitment: DACommitment,
  data: Uint8Array,
  config: DAConfig
): Promise<boolean> {
  // In production:
  // const provider = createDAProvider(config);
  // return provider.verify(commitment, data);

  const dataHash = uint8ToHex(await sha256(data));
  return commitment.dataRoot === dataHash;
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
