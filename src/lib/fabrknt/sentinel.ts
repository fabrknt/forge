/**
 * @sentinel/core integration — Guard, execution patterns, Jito bundles.
 *
 * Usage in Forge:
 * - Guard validates transactions before on-chain execution
 * - DCA/rebalance pattern builders drive the "Trade" step
 * - Jito bundle tips provide MEV-protected execution
 */

import type {
  GuardConfig,
  Transaction,
  ValidationResult,
  SecurityWarning,
  DCAConfig,
  RebalanceConfig,
  GridTradingConfig,
  TradingPair,
  Price,
  Token,
} from "./types/sentinel";

// ---------------------------------------------------------------------------
// Guard — transaction security
// ---------------------------------------------------------------------------

const DEFAULT_GUARD_CONFIG: GuardConfig = {
  mode: "warn",
  riskTolerance: "moderate",
};

export function createGuard(overrides?: Partial<GuardConfig>): GuardInstance {
  const config = { ...DEFAULT_GUARD_CONFIG, ...overrides };
  const history: SecurityWarning[] = [];

  return {
    async validate(tx: Transaction): Promise<ValidationResult> {
      const warnings = analyzeTransaction(tx, config);
      history.push(...warnings);

      const dominated =
        config.mode === "block" &&
        warnings.some((w) => w.severity === "critical");

      return {
        allowed: !dominated,
        warnings,
        riskScore: computeRiskScore(warnings),
      };
    },
    getHistory: () => [...history],
    clearHistory: () => {
      history.length = 0;
    },
  };
}

interface GuardInstance {
  validate(tx: Transaction): Promise<ValidationResult>;
  getHistory(): SecurityWarning[];
  clearHistory(): void;
}

function analyzeTransaction(
  tx: Transaction,
  config: GuardConfig
): SecurityWarning[] {
  const warnings: SecurityWarning[] = [];

  for (const ix of tx.instructions) {
    // P-101: Mint authority kill
    if (
      ix.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
      ix.data?.includes("setAuthority") &&
      ix.data?.includes("mintTokens") &&
      ix.data?.includes("null")
    ) {
      warnings.push({
        id: "P-101",
        pattern: "Mint authority kill",
        severity: "critical",
        message: "Transaction removes mint authority — irreversible.",
        instruction: ix,
      });
    }

    // P-102: Freeze authority kill
    if (
      ix.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
      ix.data?.includes("setAuthority") &&
      ix.data?.includes("freezeAccount") &&
      ix.data?.includes("null")
    ) {
      warnings.push({
        id: "P-102",
        pattern: "Freeze authority kill",
        severity: "critical",
        message: "Transaction removes freeze authority — irreversible.",
        instruction: ix,
      });
    }

    // P-104: Dangerous account close
    if (
      ix.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
      ix.data?.includes("closeAccount")
    ) {
      const hasBalance = ix.accounts?.some((a) => a.isWritable);
      if (hasBalance) {
        warnings.push({
          id: "P-104",
          pattern: "Dangerous account close",
          severity: "alert",
          message: "Closing token account that may still hold tokens.",
          instruction: ix,
        });
      }
    }

    // P-105: Transfer hook with suspicious program
    if (ix.programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
      const knownHookPrograms = new Set<string>(); // populated from config
      if (ix.data?.includes("transferHook")) {
        const hookProgram = ix.accounts?.[ix.accounts.length - 1]?.pubkey;
        if (hookProgram && !knownHookPrograms.has(hookProgram)) {
          warnings.push({
            id: "P-105",
            pattern: "Malicious transfer hook",
            severity: "critical",
            message: `Unknown transfer hook program: ${hookProgram}`,
            instruction: ix,
          });
        }
      }
    }

    // P-108: Excessive hook accounts
    if (ix.remainingAccounts && ix.remainingAccounts.length > 10) {
      warnings.push({
        id: "P-108",
        pattern: "Excessive hook accounts",
        severity: "warning",
        message: `Transfer hook uses ${ix.remainingAccounts.length} extra accounts.`,
        instruction: ix,
      });
    }
  }

  // Apply risk tolerance filter
  if (config.riskTolerance === "permissive") {
    return warnings.filter((w) => w.severity === "critical");
  }
  if (config.riskTolerance === "moderate") {
    return warnings.filter((w) => w.severity !== "warning");
  }
  return warnings; // strict: return all
}

function computeRiskScore(warnings: SecurityWarning[]): number {
  let score = 0;
  for (const w of warnings) {
    if (w.severity === "critical") score += 40;
    else if (w.severity === "alert") score += 20;
    else score += 10;
  }
  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Execution patterns — DCA, rebalance, grid trading
// ---------------------------------------------------------------------------

export function buildDCAPlan(config: DCAConfig) {
  const amountPerOrder = config.totalAmount / config.numberOfOrders;
  const orders = Array.from({ length: config.numberOfOrders }, (_, i) => ({
    orderNumber: i + 1,
    amount: amountPerOrder,
    scheduledAt: config.startTime
      ? config.startTime + i * config.intervalMs
      : Date.now() + i * config.intervalMs,
    pair: config.pair,
    status: "pending" as const,
  }));

  return {
    type: "dca" as const,
    pair: config.pair,
    totalAmount: config.totalAmount,
    numberOfOrders: config.numberOfOrders,
    intervalMs: config.intervalMs,
    amountPerOrder,
    orders,
    estimatedCompletionTime:
      (config.startTime ?? Date.now()) +
      (config.numberOfOrders - 1) * config.intervalMs,
  };
}

export function buildRebalancePlan(config: RebalanceConfig) {
  const totalValue = Object.values(config.currentHoldings).reduce(
    (sum, h) => sum + h.value,
    0
  );

  const trades: Array<{
    token: string;
    side: "buy" | "sell";
    amount: number;
    currentPct: number;
    targetPct: number;
    driftPct: number;
  }> = [];

  for (const [token, target] of Object.entries(config.targetAllocations)) {
    const current = config.currentHoldings[token];
    const currentPct = current ? (current.value / totalValue) * 100 : 0;
    const driftPct = Math.abs(currentPct - target.percentage);

    if (driftPct > (config.rebalanceThreshold ?? 5)) {
      const targetValue = (target.percentage / 100) * totalValue;
      const currentValue = current?.value ?? 0;
      const diff = targetValue - currentValue;

      trades.push({
        token,
        side: diff > 0 ? "buy" : "sell",
        amount: Math.abs(diff),
        currentPct,
        targetPct: target.percentage,
        driftPct,
      });
    }
  }

  return {
    type: "rebalance" as const,
    totalValue,
    trades,
    driftDetected: trades.length > 0,
    threshold: config.rebalanceThreshold ?? 5,
  };
}

export function buildGridTradingPlan(config: GridTradingConfig) {
  const step =
    (config.upperBound - config.lowerBound) / (config.gridLevels - 1);
  const levels = Array.from({ length: config.gridLevels }, (_, i) => {
    const price = config.lowerBound + i * step;
    return {
      level: i + 1,
      price,
      side: price < config.currentPrice.price ? ("buy" as const) : ("sell" as const),
      amount: config.amountPerGrid,
    };
  });

  return {
    type: "grid" as const,
    pair: config.pair,
    levels,
    gridSpacing: step,
    totalBuyAmount:
      levels.filter((l) => l.side === "buy").length * config.amountPerGrid,
    totalSellAmount:
      levels.filter((l) => l.side === "sell").length * config.amountPerGrid,
  };
}

// ---------------------------------------------------------------------------
// Jito bundle tips
// ---------------------------------------------------------------------------

const JITO_TIP_LAMPORTS = {
  low: 1_000,
  medium: 10_000,
  high: 100_000,
  very_high: 1_000_000,
  turbo: 10_000_000,
} as const;

const JITO_TIP_ACCOUNTS: Record<string, string[]> = {
  default: [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4bPqkfRBnb2nA3Q9N4WcuLM",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSKBTcTN6NAbhfq3YqS",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL6d33",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
  ],
  tokyo: [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4bPqkfRBnb2nA3Q9N4WcuLM",
  ],
};

export function getTipInfo(
  level: keyof typeof JITO_TIP_LAMPORTS = "medium",
  region = "default"
) {
  const tipAmount = JITO_TIP_LAMPORTS[level];
  const accounts = JITO_TIP_ACCOUNTS[region] ?? JITO_TIP_ACCOUNTS["default"];
  const tipAccount = accounts[Math.floor(Math.random() * accounts.length)];

  return {
    tipAmount,
    tipAmountSol: tipAmount / 1e9,
    tipAccount,
    region,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const sentinel = {
  createGuard,
  buildDCAPlan,
  buildRebalancePlan,
  buildGridTradingPlan,
  getTipInfo,
};
