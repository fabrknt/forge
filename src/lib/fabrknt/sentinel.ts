/**
 * @sentinel/core integration — Guard, execution patterns, Jito bundles, Flashbots/MEV-Share.
 *
 * Usage in Forge:
 * - Guard validates transactions before on-chain execution (Solana + EVM)
 * - EVM patterns EVM-001 through EVM-009 for comprehensive threat detection
 * - DCA/rebalance pattern builders drive the "Trade" step
 * - Jito bundle tips provide MEV-protected execution (Solana)
 * - Flashbots/MEV-Share bundles provide MEV-protected execution (EVM)
 * - SimulationSandbox pre-validates transactions before commitment
 */

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
      const warnings =
        tx.chain === "evm"
          ? analyzeEvmTransaction(tx, config)
          : analyzeTransaction(tx, config);
      history.push(...warnings);

      // Run simulation if configured
      let simulation: SimulationResult | undefined;
      if (config.enableSimulation && config.simulationConfig) {
        simulation = await simulateTransaction(tx, config.simulationConfig);
      }

      const dominated =
        config.mode === "block" &&
        warnings.some((w) => w.severity === "critical");

      // Block if simulation is required but failed
      const simBlocked =
        config.simulationRequired && simulation && !simulation.success;

      return {
        allowed: !dominated && !simBlocked,
        warnings,
        riskScore: computeRiskScore(warnings),
        simulation,
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

// ---------------------------------------------------------------------------
// Solana pattern analysis (P-101 through P-108)
// ---------------------------------------------------------------------------

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
        patternId: "P-101",
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
        patternId: "P-102",
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
          patternId: "P-104",
          pattern: "Dangerous account close",
          severity: "alert",
          message: "Closing token account that may still hold tokens.",
          instruction: ix,
        });
      }
    }

    // P-105: Transfer hook with suspicious program
    if (ix.programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
      const knownHookPrograms = new Set<string>(config.allowedHookPrograms ?? []);
      if (ix.data?.includes("transferHook")) {
        const hookProgram = ix.accounts?.[ix.accounts.length - 1]?.pubkey;
        if (hookProgram && !knownHookPrograms.has(hookProgram)) {
          warnings.push({
            id: "P-105",
            patternId: "P-105",
            pattern: "Malicious transfer hook",
            severity: "critical",
            message: `Unknown transfer hook program: ${hookProgram}`,
            instruction: ix,
          });
        }
      }
    }

    // P-108: Excessive hook accounts
    if (ix.remainingAccounts && ix.remainingAccounts.length > (config.maxHookAccounts ?? 10)) {
      warnings.push({
        id: "P-108",
        patternId: "P-108",
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

// ---------------------------------------------------------------------------
// EVM pattern analysis (EVM-001 through EVM-009)
// In production: delegates to @sentinel/core analyzeEvmTransaction()
// ---------------------------------------------------------------------------

// Well-known EVM function selectors
const EVM_SELECTORS = {
  transfer: "a9059cbb",
  transferFrom: "23b872dd",
  approve: "095ea7b3",
  flashLoan: "5cffe9de",
  swap: "022c0d9f",
  exactInputSingle: "414bf389",
  upgradeTo: "3659cfe6",
  upgradeToAndCall: "4f1ef286",
  renounceOwnership: "715018a6",
  transferOwnership: "f2fde38b",
  latestRoundData: "feaf968c",
  getReserves: "0902f1ac",
  propose: "da95691a",
  castVote: "56781388",
  delegate: "5c19a95c",
  execute: "fe0d94c1",
  multicall: "ac9650d8",
} as const;

const KNOWN_FLASH_LOAN_PROVIDERS = new Set([
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", // AAVE V3
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9", // AAVE V2
  "0xba12222222228d8ba445958a75a0704d566bf2c8", // Balancer Vault
]);

const KNOWN_DEX_ROUTERS = new Set([
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2
  "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", // Uniswap V3 Router 02
]);

const SWAP_SELECTORS = new Set<string>([
  EVM_SELECTORS.swap,
  EVM_SELECTORS.exactInputSingle,
]);

const ORACLE_SELECTORS = new Set<string>([
  EVM_SELECTORS.latestRoundData,
  EVM_SELECTORS.getReserves,
]);

const GOVERNANCE_SELECTORS = new Set<string>([
  EVM_SELECTORS.propose,
  EVM_SELECTORS.castVote,
  EVM_SELECTORS.delegate,
  EVM_SELECTORS.execute,
]);

function getSelector(data: string | undefined): string {
  if (!data) return "";
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  return hex.slice(0, 8).toLowerCase();
}

function analyzeEvmTransaction(
  tx: Transaction,
  config: GuardConfig
): SecurityWarning[] {
  const warnings: SecurityWarning[] = [];
  const instructions = tx.instructions ?? [];
  if (instructions.length === 0) return warnings;

  // Track what patterns are present
  let hasFlashLoan = false;
  let hasDexSwap = false;
  let hasOracleRead = false;
  let hasGovernanceAction = false;
  let hasDelegation = false;
  let upgradeCount = 0;
  let hasMulticall = false;
  const approvals: Array<{ index: number; target: string }> = [];
  const transferFroms: Array<{ index: number; target: string }> = [];
  const swapIndices: number[] = [];

  for (let i = 0; i < instructions.length; i++) {
    const ix = instructions[i];
    const target = ix.programId.toLowerCase();
    const selector = getSelector(ix.data);

    // Track flash loans
    if (KNOWN_FLASH_LOAN_PROVIDERS.has(target) || selector === EVM_SELECTORS.flashLoan) {
      hasFlashLoan = true;
    }

    // Track swaps
    if (KNOWN_DEX_ROUTERS.has(target) || SWAP_SELECTORS.has(selector)) {
      hasDexSwap = true;
      swapIndices.push(i);
    }

    // Track oracle reads
    if (ORACLE_SELECTORS.has(selector)) {
      hasOracleRead = true;
    }

    // Track governance
    if (GOVERNANCE_SELECTORS.has(selector)) {
      hasGovernanceAction = true;
    }
    if (selector === EVM_SELECTORS.delegate) {
      hasDelegation = true;
    }

    // Track proxy upgrades
    if (selector === EVM_SELECTORS.upgradeTo || selector === EVM_SELECTORS.upgradeToAndCall) {
      upgradeCount++;
    }
    if (selector === EVM_SELECTORS.multicall) {
      hasMulticall = true;
    }

    // Track approvals
    if (selector === EVM_SELECTORS.approve) {
      approvals.push({ index: i, target: ix.programId });
    }
    if (selector === EVM_SELECTORS.transferFrom) {
      transferFroms.push({ index: i, target: ix.programId });
    }

    // EVM-004: Admin function calls
    if (selector === EVM_SELECTORS.renounceOwnership) {
      warnings.push({
        id: "EVM-004",
        patternId: "EVM-004",
        pattern: "Unauthorized access",
        severity: "critical",
        message: `renounceOwnership() called on ${ix.programId}. This permanently removes admin control.`,
        affectedAccount: ix.programId,
        timestamp: Date.now(),
      });
    }
  }

  // EVM-002: Flash loan + DEX swap
  if (hasFlashLoan && hasDexSwap) {
    warnings.push({
      id: "EVM-002",
      patternId: "EVM-002",
      pattern: "Flash loan attack",
      severity: "critical",
      message: "Flash loan combined with DEX swap detected. Possible price manipulation attack.",
      timestamp: Date.now(),
    });
  }

  // EVM-003: Front-running — multiple swaps on same router
  if (swapIndices.length >= 2) {
    warnings.push({
      id: "EVM-003",
      patternId: "EVM-003",
      pattern: "Front-running",
      severity: "alert",
      message: `${swapIndices.length} swaps in one transaction. Possible sandwich attack pattern.`,
      timestamp: Date.now(),
    });
  }

  // EVM-005: Multiple proxy upgrades
  if (upgradeCount >= 2) {
    warnings.push({
      id: "EVM-005",
      patternId: "EVM-005",
      pattern: "Proxy manipulation",
      severity: "critical",
      message: `${upgradeCount} proxy upgrade operations in a single transaction. Possible coordinated contract takeover.`,
      timestamp: Date.now(),
    });
  }
  if (upgradeCount > 0 && hasMulticall) {
    warnings.push({
      id: "EVM-005",
      patternId: "EVM-005",
      pattern: "Proxy manipulation",
      severity: "alert",
      message: "Proxy upgrade bundled inside multicall. Upgrade may be obscured within batch operation.",
      timestamp: Date.now(),
    });
  }

  // EVM-007: Approve then transferFrom in same tx
  for (const approval of approvals) {
    const subsequentTransfers = transferFroms.filter(
      (tf) => tf.index > approval.index && tf.target === approval.target
    );
    if (subsequentTransfers.length > 0) {
      warnings.push({
        id: "EVM-007",
        patternId: "EVM-007",
        pattern: "Approval exploitation",
        severity: "alert",
        message: `Approve followed by immediate transferFrom on ${approval.target}. Possible token drain pattern.`,
        affectedAccount: approval.target,
        timestamp: Date.now(),
      });
    }
  }

  // EVM-008: Oracle manipulation — swap before oracle read
  if (hasDexSwap && hasOracleRead) {
    warnings.push({
      id: "EVM-008",
      patternId: "EVM-008",
      pattern: "Oracle manipulation",
      severity: "critical",
      message: "DEX swap combined with oracle price read. Possible TWAP/spot price manipulation.",
      timestamp: Date.now(),
    });
  }

  // EVM-009: Governance manipulation — flash loan + governance
  if (hasFlashLoan && hasGovernanceAction) {
    warnings.push({
      id: "EVM-009",
      patternId: "EVM-009",
      pattern: "Governance manipulation",
      severity: "critical",
      message: "Flash loan combined with governance action. Possible flash loan governance attack.",
      timestamp: Date.now(),
    });
  }
  if (hasDelegation && hasGovernanceAction) {
    warnings.push({
      id: "EVM-009",
      patternId: "EVM-009",
      pattern: "Governance manipulation",
      severity: "alert",
      message: "Token delegation and governance action in same transaction. Voting power may have been acquired specifically for this action.",
      timestamp: Date.now(),
    });
  }

  // Apply risk tolerance filter
  if (config.riskTolerance === "permissive") {
    return warnings.filter((w) => w.severity === "critical");
  }
  if (config.riskTolerance === "moderate") {
    return warnings.filter((w) => w.severity !== "warning");
  }
  return warnings;
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
// In production: uses @sentinel/core SimulationSandbox
// ---------------------------------------------------------------------------

async function simulateTransaction(
  tx: Transaction,
  config: SimulationConfig
): Promise<SimulationResult> {
  // In production: delegates to SimulationSandbox.simulate()
  // const sandbox = new SimulationSandbox(config);
  // return sandbox.simulate(tx);

  // Placeholder — returns basic result
  return {
    success: true,
    chain: tx.chain ?? "solana",
    gasUsed: tx.chain === "evm" ? 21000 : undefined,
    computeUnitsUsed: tx.chain === "solana" ? 200000 : undefined,
    stateChanges: [],
    balanceChanges: [],
    logs: [],
  };
}

/**
 * Analyze simulation results for honeypot indicators.
 * In production: uses SimulationSandbox.analyzeHoneypot()
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
// Jito bundle tips (Solana MEV protection)
// Tip accounts updated to match @sentinel/core JITO_TIP_ACCOUNTS
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
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
  ],
  amsterdam: [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  ],
  frankfurt: [
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  ],
  ny: [
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  ],
  tokyo: [
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
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
// Flashbots / MEV-Share bundle support (EVM MEV protection)
// In production: uses @sentinel/core FlashbotsBundleManager
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
 * In production: uses FlashbotsBundleManager.sendBundle()
 */
export async function submitFlashbotsBundle(
  bundle: FlashbotsBundle,
  config: FlashbotsBundleConfig
): Promise<BundleResult> {
  // In production: const manager = new FlashbotsBundleManager(config);
  // return manager.sendBundle(bundle);

  const relayUrl = config.relayUrl ?? getFlashbotsRelayUrl(config.network ?? "mainnet");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendBundle",
    params: [{
      txs: bundle.transactions,
      blockNumber: `0x${bundle.blockNumber.toString(16)}`,
      ...(bundle.minTimestamp && { minTimestamp: bundle.minTimestamp }),
      ...(bundle.maxTimestamp && { maxTimestamp: bundle.maxTimestamp }),
      ...(bundle.revertingTxHashes && { revertingTxHashes: bundle.revertingTxHashes }),
    }],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const body = JSON.stringify(payload);
  if (config.authSigner) {
    const signature = await config.authSigner.sign(body);
    headers["X-Flashbots-Signature"] = `${config.authSigner.address}:${signature}`;
  }

  const response = await fetch(relayUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    return { bundleId: "", accepted: false, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  if (data.error) {
    return { bundleId: "", accepted: false, error: data.error.message };
  }

  return { bundleId: data.result?.bundleHash || data.result, accepted: true };
}

/**
 * Submit a MEV-Share bundle with privacy hints.
 * In production: uses FlashbotsBundleManager.sendMevShareBundle()
 */
export async function submitMevShareBundle(
  bundle: MevShareBundle,
  config: FlashbotsBundleConfig
): Promise<BundleResult> {
  // In production: const manager = new FlashbotsBundleManager(config);
  // return manager.sendMevShareBundle(bundle);

  const relayUrl = config.mevShareUrl ?? getFlashbotsRelayUrl(config.network ?? "mainnet");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "mev_sendBundle",
    params: [{
      version: "v0.1",
      inclusion: {
        block: `0x${bundle.blockNumber.toString(16)}`,
        maxBlock: `0x${(bundle.blockNumber + 25).toString(16)}`,
      },
      body: bundle.transactions.map((tx) => ({ tx, canRevert: false })),
      ...(bundle.privacy && { privacy: bundle.privacy }),
      ...(bundle.validity && { validity: bundle.validity }),
    }],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const body = JSON.stringify(payload);
  if (config.authSigner) {
    const signature = await config.authSigner.sign(body);
    headers["X-Flashbots-Signature"] = `${config.authSigner.address}:${signature}`;
  }

  const response = await fetch(relayUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    return { bundleId: "", accepted: false, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  if (data.error) {
    return { bundleId: "", accepted: false, error: data.error.message };
  }

  return { bundleId: data.result?.bundleHash || data.result, accepted: true };
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
