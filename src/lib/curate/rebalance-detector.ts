/**
 * Rebalance Detector
 * Detects conditions that suggest a user should rebalance their allocation
 *
 * Integrates:
 * - @sentinel: buildRebalancePlan() for actionable rebalance trade lists
 * - @complr: checkAllocationCompliance() for regulatory screening
 */

import { RiskTolerance } from "@/components/curate/quick-start";
import { RecommendedAllocation, AllocationRecommendation } from "@/components/curate/recommendation-display";
import { sentinel } from "@/lib/fabrknt/sentinel";
import { compliance } from "@/lib/fabrknt/compliance";

// Alert severity levels
export type AlertSeverity = "info" | "warning" | "critical";

// Types of rebalance triggers
export type AlertType =
    | "apy_drop"           // APY dropped significantly
    | "risk_increase"      // Risk score increased
    | "better_alternative" // Better pool emerged
    | "protocol_issue";    // Protocol-specific concern

export interface RebalanceAlert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    poolId: string;
    poolName: string;
    protocol: string;
    title: string;
    message: string;
    action: string;
    impact: {
        currentValue: number;
        suggestedValue?: number;
        potentialGain?: number;
    };
    createdAt: Date;
}

export interface RebalanceAnalysis {
    alerts: RebalanceAlert[];
    overallHealth: "healthy" | "attention" | "action_needed";
    summary: string;
    lastChecked: Date;
}

// Current pool data structure
interface CurrentPoolData {
    id: string;
    name: string;
    protocol: string;
    currentApy: number;
    previousApy: number;
    currentRiskScore: number;
    previousRiskScore: number;
    tvl: number;
    tvlChange24h: number;
    status: "active" | "deprecated" | "warning";
    alerts?: string[];
}

// Mock current pool data - in production this would be fetched from API
const CURRENT_POOL_DATA: CurrentPoolData[] = [
    {
        id: "kamino-usdc-lending",
        name: "USDC Lending",
        protocol: "Kamino",
        currentApy: 6.5,
        previousApy: 6.8,
        currentRiskScore: 12,
        previousRiskScore: 12,
        tvl: 450_000_000,
        tvlChange24h: 2.5,
        status: "active",
    },
    {
        id: "marginfi-usdc",
        name: "USDC Supply",
        protocol: "Marginfi",
        currentApy: 5.8,
        previousApy: 6.2,
        currentRiskScore: 15,
        previousRiskScore: 15,
        tvl: 320_000_000,
        tvlChange24h: 1.2,
        status: "active",
    },
    {
        id: "save-usdc",
        name: "USDC Supply",
        protocol: "Save",
        currentApy: 5.5,
        previousApy: 5.8,
        currentRiskScore: 14,
        previousRiskScore: 14,
        tvl: 180_000_000,
        tvlChange24h: -0.5,
        status: "active",
    },
    {
        id: "kamino-sol-lending",
        name: "SOL Lending",
        protocol: "Kamino",
        currentApy: 5.2,
        previousApy: 5.5,
        currentRiskScore: 18,
        previousRiskScore: 18,
        tvl: 280_000_000,
        tvlChange24h: 3.1,
        status: "active",
    },
    {
        id: "kamino-usdt-lending",
        name: "USDT Lending",
        protocol: "Kamino",
        currentApy: 5.5,
        previousApy: 5.5,
        currentRiskScore: 16,
        previousRiskScore: 16,
        tvl: 95_000_000,
        tvlChange24h: 0.8,
        status: "active",
    },
    {
        id: "marinade-msol",
        name: "mSOL Staking",
        protocol: "Marinade",
        currentApy: 7.2,
        previousApy: 7.0,
        currentRiskScore: 20,
        previousRiskScore: 20,
        tvl: 1_200_000_000,
        tvlChange24h: 1.5,
        status: "active",
    },
    {
        id: "jito-jitosol",
        name: "JitoSOL Staking",
        protocol: "Jito",
        currentApy: 7.8,
        previousApy: 7.5,
        currentRiskScore: 22,
        previousRiskScore: 22,
        tvl: 2_100_000_000,
        tvlChange24h: 2.8,
        status: "active",
    },
    {
        id: "sanctum-inf",
        name: "INF (Infinity)",
        protocol: "Sanctum",
        currentApy: 8.5,
        previousApy: 8.2,
        currentRiskScore: 28,
        previousRiskScore: 28,
        tvl: 450_000_000,
        tvlChange24h: 4.2,
        status: "active",
    },
    {
        id: "kamino-jitosol-lending",
        name: "JitoSOL Lending",
        protocol: "Kamino",
        currentApy: 4.2,
        previousApy: 4.5,
        currentRiskScore: 25,
        previousRiskScore: 25,
        tvl: 120_000_000,
        tvlChange24h: 1.0,
        status: "active",
    },
    {
        id: "drift-usdc-perp",
        name: "USDC Insurance",
        protocol: "Drift",
        currentApy: 12.0,
        previousApy: 14.5,
        currentRiskScore: 38,
        previousRiskScore: 35,
        tvl: 85_000_000,
        tvlChange24h: -2.5,
        status: "warning",
        alerts: ["Insurance fund exposure increased due to recent market volatility"],
    },
    {
        id: "jupiter-jlp",
        name: "JLP Vault",
        protocol: "Jupiter",
        currentApy: 35.0,
        previousApy: 42.0,
        currentRiskScore: 48,
        previousRiskScore: 45,
        tvl: 650_000_000,
        tvlChange24h: -5.2,
        status: "active",
    },
    {
        id: "meteora-sol-usdc",
        name: "SOL-USDC LP",
        protocol: "Meteora",
        currentApy: 15.5,
        previousApy: 18.0,
        currentRiskScore: 45,
        previousRiskScore: 45,
        tvl: 180_000_000,
        tvlChange24h: -1.8,
        status: "active",
    },
    {
        id: "orca-sol-usdc-clmm",
        name: "SOL-USDC CLMM",
        protocol: "Orca",
        currentApy: 22.0,
        previousApy: 25.0,
        currentRiskScore: 55,
        previousRiskScore: 55,
        tvl: 95_000_000,
        tvlChange24h: -0.5,
        status: "active",
    },
    {
        id: "raydium-sol-usdc-clmm",
        name: "SOL-USDC CLMM",
        protocol: "Raydium",
        currentApy: 28.0,
        previousApy: 30.0,
        currentRiskScore: 58,
        previousRiskScore: 58,
        tvl: 75_000_000,
        tvlChange24h: 0.8,
        status: "active",
    },
    {
        id: "kamino-multiply-sol",
        name: "SOL Multiply",
        protocol: "Kamino",
        currentApy: 18.0,
        previousApy: 20.0,
        currentRiskScore: 52,
        previousRiskScore: 50,
        tvl: 110_000_000,
        tvlChange24h: -3.2,
        status: "active",
    },
    {
        id: "meteora-dlmm-sol-usdc",
        name: "SOL-USDC DLMM",
        protocol: "Meteora",
        currentApy: 45.0,
        previousApy: 55.0,
        currentRiskScore: 65,
        previousRiskScore: 62,
        tvl: 45_000_000,
        tvlChange24h: -8.5,
        status: "warning",
        alerts: ["High volatility detected - DLMM positions may require rebalancing"],
    },
];

// Thresholds for generating alerts
const ALERT_THRESHOLDS = {
    apyDropPercent: 20,
    apyDropCritical: 40,
    riskScoreIncrease: 5,
    riskScoreCritical: 10,
    tvlDropPercent: 15,
    betterAlternativeApy: 2,
};

function generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function checkApyDrops(allocations: RecommendedAllocation[]): RebalanceAlert[] {
    const alerts: RebalanceAlert[] = [];

    for (const alloc of allocations) {
        const currentData = CURRENT_POOL_DATA.find(p => p.id === alloc.poolId);
        if (!currentData) continue;

        const apyDropPercent = ((alloc.apy - currentData.currentApy) / alloc.apy) * 100;

        if (apyDropPercent >= ALERT_THRESHOLDS.apyDropCritical) {
            alerts.push({
                id: generateAlertId(),
                type: "apy_drop",
                severity: "critical",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.poolName} APY dropped ${apyDropPercent.toFixed(0)}%`,
                message: `APY has fallen from ${alloc.apy.toFixed(1)}% to ${currentData.currentApy.toFixed(1)}%. This significantly impacts your expected returns.`,
                action: "Consider reallocating to a higher-yielding alternative",
                impact: {
                    currentValue: alloc.apy,
                    suggestedValue: currentData.currentApy,
                    potentialGain: alloc.apy - currentData.currentApy,
                },
                createdAt: new Date(),
            });
        } else if (apyDropPercent >= ALERT_THRESHOLDS.apyDropPercent) {
            alerts.push({
                id: generateAlertId(),
                type: "apy_drop",
                severity: "warning",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.poolName} APY decreased`,
                message: `APY has dropped from ${alloc.apy.toFixed(1)}% to ${currentData.currentApy.toFixed(1)}% (${apyDropPercent.toFixed(0)}% decrease).`,
                action: "Monitor the pool - may need to rebalance if trend continues",
                impact: {
                    currentValue: alloc.apy,
                    suggestedValue: currentData.currentApy,
                },
                createdAt: new Date(),
            });
        }
    }

    return alerts;
}

function checkRiskIncreases(allocations: RecommendedAllocation[]): RebalanceAlert[] {
    const alerts: RebalanceAlert[] = [];

    for (const alloc of allocations) {
        const currentData = CURRENT_POOL_DATA.find(p => p.id === alloc.poolId);
        if (!currentData) continue;

        const riskIncrease = currentData.currentRiskScore - alloc.riskScore;

        if (riskIncrease >= ALERT_THRESHOLDS.riskScoreCritical) {
            alerts.push({
                id: generateAlertId(),
                type: "risk_increase",
                severity: "critical",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.poolName} risk increased significantly`,
                message: `Risk score jumped from ${alloc.riskScore} to ${currentData.currentRiskScore}. This may no longer fit your risk profile.`,
                action: "Review this position and consider moving to a safer alternative",
                impact: {
                    currentValue: alloc.riskScore,
                    suggestedValue: currentData.currentRiskScore,
                },
                createdAt: new Date(),
            });
        } else if (riskIncrease >= ALERT_THRESHOLDS.riskScoreIncrease) {
            alerts.push({
                id: generateAlertId(),
                type: "risk_increase",
                severity: "warning",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.poolName} risk level elevated`,
                message: `Risk score increased from ${alloc.riskScore} to ${currentData.currentRiskScore}.`,
                action: "Keep monitoring - risk may normalize or require action",
                impact: {
                    currentValue: alloc.riskScore,
                    suggestedValue: currentData.currentRiskScore,
                },
                createdAt: new Date(),
            });
        }
    }

    return alerts;
}

function checkBetterAlternatives(
    allocations: RecommendedAllocation[],
    riskTolerance: RiskTolerance
): RebalanceAlert[] {
    const alerts: RebalanceAlert[] = [];

    const maxRiskScore: Record<RiskTolerance, number> = {
        preserver: 18,
        steady: 25,
        balanced: 38,
        growth: 52,
        maximizer: 70,
    };

    for (const alloc of allocations) {
        const currentData = CURRENT_POOL_DATA.find(p => p.id === alloc.poolId);
        if (!currentData) continue;

        const alternatives = CURRENT_POOL_DATA.filter(p =>
            p.id !== alloc.poolId &&
            p.currentRiskScore <= maxRiskScore[riskTolerance] &&
            p.currentRiskScore <= currentData.currentRiskScore + 5 &&
            p.currentApy > currentData.currentApy + ALERT_THRESHOLDS.betterAlternativeApy &&
            p.status === "active"
        );

        if (alternatives.length > 0) {
            const best = alternatives.sort((a, b) => b.currentApy - a.currentApy)[0];

            alerts.push({
                id: generateAlertId(),
                type: "better_alternative",
                severity: "info",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `Better alternative to ${alloc.poolName}`,
                message: `${best.name} on ${best.protocol} offers ${best.currentApy.toFixed(1)}% APY vs ${currentData.currentApy.toFixed(1)}% with similar risk.`,
                action: `Consider moving ${alloc.allocation}% allocation to ${best.name}`,
                impact: {
                    currentValue: currentData.currentApy,
                    suggestedValue: best.currentApy,
                    potentialGain: best.currentApy - currentData.currentApy,
                },
                createdAt: new Date(),
            });
        }
    }

    return alerts;
}

function checkProtocolIssues(allocations: RecommendedAllocation[]): RebalanceAlert[] {
    const alerts: RebalanceAlert[] = [];

    for (const alloc of allocations) {
        const currentData = CURRENT_POOL_DATA.find(p => p.id === alloc.poolId);
        if (!currentData) continue;

        if (currentData.status === "warning" && currentData.alerts) {
            alerts.push({
                id: generateAlertId(),
                type: "protocol_issue",
                severity: "warning",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.protocol} alert`,
                message: currentData.alerts[0],
                action: "Review the protocol status and consider reducing exposure",
                impact: {
                    currentValue: alloc.allocation,
                },
                createdAt: new Date(),
            });
        }

        if (currentData.status === "deprecated") {
            alerts.push({
                id: generateAlertId(),
                type: "protocol_issue",
                severity: "critical",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.poolName} is being deprecated`,
                message: "This pool is being phased out. Move your funds to an active alternative.",
                action: "Withdraw funds and reallocate immediately",
                impact: {
                    currentValue: alloc.allocation,
                },
                createdAt: new Date(),
            });
        }

        if (currentData.tvlChange24h <= -ALERT_THRESHOLDS.tvlDropPercent) {
            alerts.push({
                id: generateAlertId(),
                type: "protocol_issue",
                severity: "warning",
                poolId: alloc.poolId,
                poolName: alloc.poolName,
                protocol: alloc.protocol,
                title: `${alloc.poolName} TVL dropping`,
                message: `TVL has decreased ${Math.abs(currentData.tvlChange24h).toFixed(1)}% in 24h. Large outflows may indicate concerns.`,
                action: "Investigate the cause and consider reducing exposure",
                impact: {
                    currentValue: currentData.tvl,
                },
                createdAt: new Date(),
            });
        }
    }

    return alerts;
}

export function analyzeForRebalance(
    recommendation: AllocationRecommendation,
    riskTolerance: RiskTolerance
): RebalanceAnalysis {
    const { allocations } = recommendation;
    const allAlerts: RebalanceAlert[] = [];

    allAlerts.push(...checkApyDrops(allocations));
    allAlerts.push(...checkRiskIncreases(allocations));
    allAlerts.push(...checkBetterAlternatives(allocations, riskTolerance));
    allAlerts.push(...checkProtocolIssues(allocations));

    // --- @complr: screen allocations for compliance issues ---
    const complianceAlerts = compliance.checkAllocationCompliance(
        allocations.map(a => ({
            protocol: a.protocol,
            poolId: a.poolId,
            percentage: a.allocation,
        }))
    );
    for (const ca of complianceAlerts) {
        allAlerts.push({
            id: generateAlertId(),
            type: "protocol_issue",
            severity: ca.severity === "critical" ? "critical" : ca.severity === "warning" ? "warning" : "info",
            poolId: ca.poolId,
            poolName: allocations.find(a => a.poolId === ca.poolId)?.poolName ?? ca.poolId,
            protocol: ca.protocol,
            title: `Compliance: ${ca.type.replace(/_/g, " ")}`,
            message: ca.message,
            action: ca.recommendation,
            impact: {
                currentValue: allocations.find(a => a.poolId === ca.poolId)?.allocation ?? 0,
            },
            createdAt: new Date(),
        });
    }

    const severityOrder: Record<AlertSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
    };
    allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const criticalCount = allAlerts.filter(a => a.severity === "critical").length;
    const warningCount = allAlerts.filter(a => a.severity === "warning").length;

    let overallHealth: "healthy" | "attention" | "action_needed";
    let summary: string;

    if (criticalCount > 0) {
        overallHealth = "action_needed";
        summary = `${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} require${criticalCount === 1 ? "s" : ""} immediate attention`;
    } else if (warningCount > 0) {
        overallHealth = "attention";
        summary = `${warningCount} warning${warningCount > 1 ? "s" : ""} to review - your allocation may need adjustment`;
    } else if (allAlerts.length > 0) {
        overallHealth = "healthy";
        summary = `${allAlerts.length} opportunity${allAlerts.length > 1 ? "ies" : "y"} available - consider optimizing your allocation`;
    } else {
        overallHealth = "healthy";
        summary = "Your allocation looks healthy - no action needed";
    }

    return {
        alerts: allAlerts,
        overallHealth,
        summary,
        lastChecked: new Date(),
    };
}

/**
 * Generate a Sentinel rebalance plan with concrete trades.
 * Called when the user decides to act on rebalance alerts.
 *
 * @sentinel: buildRebalancePlan()
 */
export function generateRebalancePlan(
    allocations: RecommendedAllocation[],
    investmentAmount: number,
    targetAllocations: Record<string, number>
) {
    const currentHoldings: Record<string, { value: number; amount: number }> = {};
    for (const alloc of allocations) {
        const value = (alloc.allocation / 100) * investmentAmount;
        currentHoldings[alloc.poolId] = { value, amount: value };
    }

    const targets: Record<string, { percentage: number }> = {};
    for (const [poolId, pct] of Object.entries(targetAllocations)) {
        targets[poolId] = { percentage: pct };
    }

    return sentinel.buildRebalancePlan({
        targetAllocations: targets,
        currentHoldings,
        rebalanceThreshold: 5,
    });
}

export function getCurrentPoolData(poolId: string): CurrentPoolData | undefined {
    return CURRENT_POOL_DATA.find(p => p.id === poolId);
}

export function getAllCurrentPoolData(): CurrentPoolData[] {
    return CURRENT_POOL_DATA;
}
