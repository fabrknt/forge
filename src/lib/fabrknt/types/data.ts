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
