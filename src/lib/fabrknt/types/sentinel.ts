// ── Guard Types ──

export type Chain = "solana" | "evm";

export interface GuardConfig {
  mode: "block" | "warn";
  riskTolerance: "strict" | "moderate" | "permissive";
  enablePatternDetection?: boolean;
  validateTransferHooks?: boolean;
  maxHookAccounts?: number;
  allowedHookPrograms?: string[];
  // EVM-specific
  trustedEvmAddresses?: string[];
  /** User-supplied oracle contract addresses to monitor (lowercase 0x-prefixed) */
  oracleAddresses?: string[];
  /** EVM RPC URL for resolving oracles from Chainlink Feed Registry at runtime */
  oracleRegistryRpcUrl?: string;
  // Simulation
  enableSimulation?: boolean;
  simulationConfig?: SimulationConfig;
  /** When true, blocks transactions that haven't been successfully simulated */
  simulationRequired?: boolean;
}

export interface Transaction {
  id: string;
  chain: Chain;
  status: "pending" | "executed" | "failed";
  instructions: Instruction[];
  signers?: string[];
  assetAddresses?: string[];
}

export interface Instruction {
  programId: string;
  data?: string;
  keys?: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  /** @deprecated Use keys instead */
  accounts?: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  remainingAccounts?: Array<{ pubkey: string }>;
}

export interface SecurityWarning {
  id: string;
  patternId?: PatternId;
  pattern: string;
  severity: "critical" | "alert" | "warning";
  message: string;
  instruction?: Instruction;
  affectedAccount?: string;
  timestamp?: number;
}

export interface ValidationResult {
  allowed: boolean;
  warnings: SecurityWarning[];
  riskScore: number;
  simulation?: SimulationResult;
}

// ── Pattern IDs (mirrors @sentinel/core PatternId enum) ──

export type PatternId =
  // Solana patterns
  | "P-101"  // MintKill
  | "P-102"  // FreezeKill
  | "P-103"  // SignerMismatch
  | "P-104"  // DangerousClose
  | "P-105"  // MaliciousTransferHook
  | "P-106"  // UnexpectedHookExecution
  | "P-107"  // HookReentrancy
  | "P-108"  // ExcessiveHookAccounts
  // EVM patterns
  | "EVM-001" // ReentrancyAttack
  | "EVM-002" // FlashLoanAttack
  | "EVM-003" // FrontRunning
  | "EVM-004" // UnauthorizedAccess
  | "EVM-005" // ProxyManipulation
  | "EVM-006" // SelfdestructAbuse
  | "EVM-007" // ApprovalExploitation
  | "EVM-008" // OracleManipulation
  | "EVM-009"; // GovernanceManipulation

// ── Simulation Types ──

export interface SimulationConfig {
  /** Fork URL for EVM simulation (e.g. Anvil RPC) */
  evmForkUrl?: string;
  /** Solana RPC URL for simulation */
  solanaRpcUrl?: string;
  /** Block number to fork from (EVM) */
  forkBlockNumber?: number;
  /** Timeout in ms for simulation (default: 30000) */
  timeout?: number;
  /** Whether to trace state changes */
  traceStateDiffs?: boolean;
}

export interface SimulationResult {
  success: boolean;
  chain: Chain;
  gasUsed?: number;
  computeUnitsUsed?: number;
  stateChanges?: StateChange[];
  balanceChanges?: BalanceChange[];
  logs?: string[];
  error?: string;
  revertReason?: string;
}

export interface StateChange {
  address: string;
  slot?: string;
  previousValue?: string;
  newValue?: string;
}

export interface BalanceChange {
  address: string;
  token?: string;
  before: string;
  after: string;
  delta: string;
}

// ── Pattern Types ──

export interface Token {
  address?: string;
  symbol: string;
  decimals: number;
  name?: string;
  /** @deprecated Use `address` instead */
  mint?: string;
}

export interface Price {
  token: string;
  price: number;
  quoteCurrency: string;
  timestamp: number;
  source?: string;
}

export interface TradingPair {
  base: Token;
  quote: Token;
  minSize?: number;
  maxSize?: number;
}

export interface DCAConfig {
  pair: TradingPair;
  totalAmount: number;
  numberOfOrders: number;
  intervalMs: number;
  startTime?: number;
}

export interface RebalanceConfig {
  targetAllocations: Record<string, { percentage: number }>;
  currentHoldings: Record<string, { value: number; amount: number }>;
  rebalanceThreshold?: number;
}

export interface GridTradingConfig {
  pair: TradingPair;
  lowerBound: number;
  upperBound: number;
  gridLevels: number;
  amountPerGrid: number;
  currentPrice: Price;
}

// ── Bundle Types ──

export interface BundleResult {
  bundleId: string;
  accepted: boolean;
  signatures?: string[];
  error?: string;
  confirmedAt?: number;
}

export interface BundleStatusResponse {
  status: "pending" | "landed" | "failed" | "invalid";
  landedSlot?: number;
  landedBlock?: number;
  transactions?: string[];
  error?: string;
}

// ── Flashbots / MEV-Share Types ──

export type FlashbotsNetwork = "mainnet" | "goerli" | "sepolia";

export interface FlashbotsBundle {
  transactions: string[];
  blockNumber: number;
  minTimestamp?: number;
  maxTimestamp?: number;
  revertingTxHashes?: string[];
}

export interface MevShareBundle {
  transactions: string[];
  blockNumber: number;
  privacy?: {
    hints?: ("calldata" | "contract_address" | "logs" | "function_selector" | "hash")[];
    builders?: string[];
  };
  validity?: {
    refund?: { bodyIdx: number; percent: number }[];
    refundConfig?: { address: string; percent: number }[];
  };
}

export interface FlashbotsBundleConfig {
  relayUrl?: string;
  mevShareUrl?: string;
  network?: FlashbotsNetwork;
  authSigner?: AuthSigner;
}

export interface AuthSigner {
  /** The address of the signing key (0x-prefixed hex) */
  address: string;
  /** Sign a message body and return the signature (0x-prefixed hex) */
  sign(body: string): Promise<string>;
}
