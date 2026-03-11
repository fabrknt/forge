export interface AllocationProof {
  leaf: string;
  root: string;
  siblings: Array<{
    hash: string;
    position: "left" | "right";
  }>;
}

export interface PoolTracker {
  capacity: number;
  data: Uint8Array;
  activeCount: number;
}

// ── ZK Verifier Types (mirrors @stratum/core zk) ──

export type ZKProofSystem = "groth16" | "plonk" | "stark";

export interface ZKProof {
  proofBytes: Uint8Array;
  publicInputs: Uint8Array[];
  system: ZKProofSystem;
}

export interface ZKArtifact {
  circuitId: string;
  provingKey: Uint8Array;
  verificationKey: Uint8Array;
}

export interface ZKWitness {
  publicInputs: Uint8Array[];
  privateInputs: Uint8Array[];
}

export interface ZKVerifier {
  verify(proof: ZKProof, publicInputs: Uint8Array[]): Promise<boolean>;
}

// ── DA Provider Types (mirrors @stratum/core da) ──

export type DAProviderType = "celestia" | "avail" | "eigenda" | "memory";

export interface DACommitment {
  provider: string;
  blockHeight: number;
  txHash: string;
  namespace?: string;
  dataRoot?: string;
  metadata?: Record<string, unknown>;
}

export interface DAConfig {
  provider: DAProviderType;
  celestia?: {
    rpcUrl: string;
    authToken: string;
    namespace: string;
  };
  avail?: {
    rpcUrl: string;
    appId: number;
  };
  eigenda?: {
    disperserUrl: string;
    quorumIds: number[];
  };
}

// ── Cranker Registry Types ──

export interface CrankerConfig {
  /** Cranker identifier */
  id: string;
  /** Wallet address of the cranker */
  wallet: string;
  /** Crank interval in milliseconds */
  intervalMs: number;
  /** Target program/contract to crank */
  targetProgram: string;
  /** Whether the cranker is currently active */
  active: boolean;
  /** Last execution timestamp */
  lastCrankedAt?: number;
  /** Number of successful cranks */
  crankCount: number;
  /** Error count since last successful crank */
  errorCount: number;
}

export interface CrankerRegistryState {
  crankers: CrankerConfig[];
  totalCranks: number;
  activeCrankers: number;
}
