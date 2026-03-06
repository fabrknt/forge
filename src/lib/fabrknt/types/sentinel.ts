export interface GuardConfig {
  mode: "block" | "warn";
  riskTolerance: "strict" | "moderate" | "permissive";
}

export interface Transaction {
  id: string;
  status: string;
  instructions: Instruction[];
}

export interface Instruction {
  programId: string;
  data?: string;
  accounts?: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  remainingAccounts?: Array<{ pubkey: string }>;
}

export interface SecurityWarning {
  id: string;
  pattern: string;
  severity: "critical" | "alert" | "warning";
  message: string;
  instruction: Instruction;
}

export interface ValidationResult {
  allowed: boolean;
  warnings: SecurityWarning[];
  riskScore: number;
}

export interface Token {
  symbol: string;
  mint: string;
  decimals: number;
}

export interface Price {
  token: string;
  price: number;
  quoteCurrency: string;
  timestamp: number;
}

export interface TradingPair {
  base: Token;
  quote: Token;
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
