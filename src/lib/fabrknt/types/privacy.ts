export interface EncryptedAllocation {
  encrypted: true;
  nonce: string;
  ciphertext: string;
  senderPublicKey: string;
  encryptedAt: number;
}

export interface SharedAccess {
  threshold: number;
  totalShares: number;
  shares: Array<{ index: number; data: string }>;
  createdAt: number;
}

export interface PrivacyConfig {
  encryptAtRest: boolean;
  enablePrivateSharing: boolean;
  dataRoomThreshold: number;
  dataRoomShares: number;
}

// ── ZK Compression Types (mirrors @veil/core zk-compression) ──

export interface ZkCompressionConfig {
  rpcUrl: string;
  compressionRpcUrl?: string;
  proverRpcUrl?: string;
}

export interface CompressedPayload {
  compressedData: Uint8Array;
  proof: Uint8Array;
  publicInputs: Uint8Array;
  stateTreeRoot: Uint8Array;
  dataHash: Uint8Array;
}

export interface CompressionSavings {
  uncompressedCost: bigint;
  compressedCost: bigint;
  savings: bigint;
  savingsPercent: number;
}

// ── Shielded Transfer Types (mirrors @veil/core shielded) ──

export interface ShieldedTransferParams {
  amount: bigint;
  recipient: string;
  tokenType: "SOL" | "USDC" | "USDT";
  memo?: string;
}

export interface ShieldedBalance {
  balance: bigint;
  tokenType: "SOL" | "USDC" | "USDT";
  lastUpdated: Date;
}

export interface DepositResult {
  signature: string;
  commitment: Uint8Array;
  nullifier: Uint8Array;
}

export interface WithdrawalResult {
  signature: string;
  amount: bigint;
  recipient: string;
}

// ── Encrypted Swap Order Types (mirrors @veil/core payload schemas) ──

export interface EncryptedSwapOrder {
  /** Encrypted order data */
  ciphertext: Uint8Array;
  /** Nonce used for encryption */
  nonce: Uint8Array;
  /** Public key of the sender */
  senderPublicKey: Uint8Array;
  /** Order commitment hash (public, for matching) */
  commitmentHash: string;
  /** Expiry timestamp */
  expiresAt: number;
}

export interface SwapOrderSchema {
  inputMint: string;
  outputMint: string;
  inputAmount: bigint;
  minOutputAmount: bigint;
  maxSlippageBps: number;
  expiresAt: number;
}
