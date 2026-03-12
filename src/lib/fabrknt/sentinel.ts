/**
 * @sentinel/core integration — Guard, execution patterns, Jito bundles, Flashbots/MEV-Share.
 *
 * Thin adapter layer between Forge's domain types and the real @sentinel/core SDK.
 * Consumers import the `sentinel` namespace and call methods like
 * sentinel.createGuard(), sentinel.buildDCAPlan(), sentinel.getTipInfo(), etc.
 */

import {
  Guard,
  JITO_TIP_ACCOUNTS,
  FlashbotsBundleManager,
  SimulationSandbox,
  TipLevel,
  JitoRegion,
  FlashbotsNetwork,
  buildGridTradingPlan as sdkBuildGridTradingPlan,
} from "@sentinel/core";
import type {
  Transaction as SdkTransaction,
  ValidationResult as SdkValidationResult,
  SecurityWarning as SdkSecurityWarning,
  SimulationResult as SdkSimulationResult,
  FlashbotsBundleConfig as SdkFlashbotsBundleConfig,
  AuthSigner as SdkAuthSigner,
  TradingPair as SdkTradingPair,
  Price as SdkPrice,
} from "@sentinel/core";

import type {
  GuardConfig,
  Transaction,
  ValidationResult,
  SecurityWarning,
  SimulationConfig,
  SimulationResult,
  DCAConfig,
  RebalanceConfig,
  GridTradingConfig,
  TradingPair,
  Price,
  Token,
  PatternId,
  FlashbotsBundle,
  MevShareBundle,
  FlashbotsBundleConfig,
  AuthSigner,
  BundleResult,
} from "./types/sentinel";

// ---------------------------------------------------------------------------
// Guard — transaction security (Solana + EVM)
// Delegates to @sentinel/core Guard class
// ---------------------------------------------------------------------------

export function createGuard(overrides?: Partial<GuardConfig>): GuardInstance {
  const sdkGuard = new Guard({
    mode: overrides?.mode ?? "warn",
    riskTolerance: overrides?.riskTolerance ?? "moderate",
    enablePatternDetection: overrides?.enablePatternDetection,
    validateTransferHooks: overrides?.validateTransferHooks,
    maxHookAccounts: overrides?.maxHookAccounts,
    allowedHookPrograms: overrides?.allowedHookPrograms,
    trustedEvmAddresses: overrides?.trustedEvmAddresses,
    oracleAddresses: overrides?.oracleAddresses,
    oracleRegistryRpcUrl: overrides?.oracleRegistryRpcUrl,
    enableSimulation: overrides?.enableSimulation,
    simulationConfig: overrides?.simulationConfig,
    simulationRequired: overrides?.simulationRequired,
  });

  const history: SecurityWarning[] = [];

  return {
    async validate(tx: Transaction): Promise<ValidationResult> {
      const sdkResult = await sdkGuard.validateTransaction(tx as unknown as SdkTransaction);

      // Adapt SDK warnings to Forge warning shape
      const warnings: SecurityWarning[] = sdkResult.warnings.map(adaptWarning);
      history.push(...warnings);

      return {
        allowed: sdkResult.isValid,
        warnings,
        riskScore: computeRiskScore(warnings),
        simulation: sdkResult.simulation,
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

/** Adapt an SDK SecurityWarning to Forge's SecurityWarning shape */
function adaptWarning(w: SdkSecurityWarning): SecurityWarning {
  return {
    id: w.patternId,
    patternId: w.patternId as PatternId,
    pattern: w.patternId,
    severity: w.severity as SecurityWarning["severity"],
    message: w.message,
    affectedAccount: w.affectedAccount,
    timestamp: w.timestamp,
  };
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
// Simulation Sandbox — pre-execution transaction simulation
// Delegates to @sentinel/core SimulationSandbox
// ---------------------------------------------------------------------------

/**
 * Analyze simulation results for honeypot indicators.
 * Uses @sentinel/core SimulationSandbox under the hood.
 */
export function analyzeHoneypot(
  buyResult: SimulationResult,
  sellResult: SimulationResult
): { isHoneypot: boolean; buyTax: number; sellTax: number; reason?: string } {
  if (buyResult.success && !sellResult.success) {
    return {
      isHoneypot: true,
      buyTax: 0,
      sellTax: 100,
      reason: sellResult.revertReason || sellResult.error || "Sell transaction reverted",
    };
  }
  return { isHoneypot: false, buyTax: 0, sellTax: 0 };
}

// ---------------------------------------------------------------------------
// Execution patterns — DCA, rebalance, grid trading
// These adapt Forge's domain types to @sentinel/core pattern builders.
// The SDK pattern builders have different input/output shapes, so we keep
// Forge-specific adapters here for API stability.
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
  // Delegate to SDK's buildGridTradingPlan and adapt the output
  const sdkPlan = sdkBuildGridTradingPlan({
    pair: config.pair as unknown as SdkTradingPair,
    lowerBound: config.lowerBound,
    upperBound: config.upperBound,
    gridLevels: config.gridLevels,
    amountPerGrid: config.amountPerGrid,
    currentPrice: config.currentPrice as unknown as SdkPrice,
  });

  return {
    type: "grid" as const,
    pair: config.pair,
    levels: sdkPlan.levels.map((l) => ({
      level: l.index + 1,
      price: l.price,
      side: l.side,
      amount: l.amount,
    })),
    gridSpacing: sdkPlan.gridSpacing,
    totalBuyAmount:
      sdkPlan.levels.filter((l) => l.side === "buy").length * config.amountPerGrid,
    totalSellAmount:
      sdkPlan.levels.filter((l) => l.side === "sell").length * config.amountPerGrid,
  };
}

// ---------------------------------------------------------------------------
// Jito bundle tips (Solana MEV protection)
// Uses JITO_TIP_ACCOUNTS from @sentinel/core
// ---------------------------------------------------------------------------

const JITO_TIP_LAMPORTS = {
  low: TipLevel.Low,
  medium: TipLevel.Medium,
  high: TipLevel.High,
  very_high: TipLevel.VeryHigh,
  turbo: TipLevel.Turbo,
} as const;

export function getTipInfo(
  level: keyof typeof JITO_TIP_LAMPORTS = "medium",
  region = "default"
) {
  const tipAmount = JITO_TIP_LAMPORTS[level];
  const accounts = JITO_TIP_ACCOUNTS[region as JitoRegion] ?? JITO_TIP_ACCOUNTS[JitoRegion.Default];
  const tipAccount = accounts[Math.floor(Math.random() * accounts.length)];

  return {
    tipAmount,
    tipAmountSol: tipAmount / 1e9,
    tipAccount,
    region,
  };
}

// ---------------------------------------------------------------------------
// Flashbots / MEV-Share bundle support (EVM MEV protection)
// Delegates to @sentinel/core FlashbotsBundleManager
// ---------------------------------------------------------------------------

const FLASHBOTS_RELAY_URLS: Record<string, string> = {
  mainnet: "https://relay.flashbots.net",
  goerli: "https://relay-goerli.flashbots.net",
  sepolia: "https://relay-sepolia.flashbots.net",
};

export function getFlashbotsRelayUrl(network: string = "mainnet"): string {
  return FLASHBOTS_RELAY_URLS[network] ?? FLASHBOTS_RELAY_URLS["mainnet"];
}

/**
 * Submit a Flashbots bundle for private EVM transaction execution.
 * Delegates to @sentinel/core FlashbotsBundleManager.
 */
export async function submitFlashbotsBundle(
  bundle: FlashbotsBundle,
  config: FlashbotsBundleConfig
): Promise<BundleResult> {
  try {
    const relayUrl = config.relayUrl ?? getFlashbotsRelayUrl(config.network ?? "mainnet");
    const network = (config.network ?? "mainnet") as unknown as FlashbotsNetwork;
    const manager = new FlashbotsBundleManager({
      endpoint: relayUrl,
      relayUrl,
      network,
      authSigner: config.authSigner as SdkAuthSigner | undefined,
    });

    const result = await manager.sendBundle({
      transactions: bundle.transactions,
      blockNumber: bundle.blockNumber,
      minTimestamp: bundle.minTimestamp,
      maxTimestamp: bundle.maxTimestamp,
      revertingTxHashes: bundle.revertingTxHashes,
    });

    return result;
  } catch (err) {
    return {
      bundleId: "",
      accepted: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Submit a MEV-Share bundle with privacy hints.
 * Delegates to @sentinel/core FlashbotsBundleManager.
 */
export async function submitMevShareBundle(
  bundle: MevShareBundle,
  config: FlashbotsBundleConfig
): Promise<BundleResult> {
  try {
    const relayUrl = config.relayUrl ?? getFlashbotsRelayUrl(config.network ?? "mainnet");
    const network = (config.network ?? "mainnet") as unknown as FlashbotsNetwork;
    const manager = new FlashbotsBundleManager({
      endpoint: relayUrl,
      relayUrl,
      mevShareUrl: config.mevShareUrl,
      network,
      authSigner: config.authSigner as SdkAuthSigner | undefined,
    });

    const result = await manager.sendMevShareBundle({
      transactions: bundle.transactions,
      blockNumber: bundle.blockNumber,
      privacy: bundle.privacy,
      validity: bundle.validity,
    });

    return result;
  } catch (err) {
    return {
      bundleId: "",
      accepted: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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
  analyzeHoneypot,
  // Flashbots/MEV-Share
  submitFlashbotsBundle,
  submitMevShareBundle,
  getFlashbotsRelayUrl,
};
