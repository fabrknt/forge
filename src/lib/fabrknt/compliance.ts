/**
 * @complr integration — Off-chain compliance screening.
 *
 * Usage in Forge:
 * - Screen wallets during onboarding (risk scoring)
 * - Check pools against regulatory blacklists before recommending
 * - Generate compliance alerts when allocated pools face regulatory issues
 */

import type {
  Jurisdiction,
  WalletScreenResult,
  PoolComplianceResult,
  ComplianceAlert,
} from "./types/compliance";

// ---------------------------------------------------------------------------
// Wallet screening
// ---------------------------------------------------------------------------

export async function screenWallet(
  address: string,
  jurisdictions: Jurisdiction[] = ["MAS", "FSA"]
): Promise<WalletScreenResult> {
  // In production, calls ComplrClient.screenWallet()
  // For dogfooding, simulates the screening pipeline
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Check address format validity
  if (address.length < 32 || address.length > 44) {
    riskFactors.push("Invalid address format");
    riskScore += 50;
  }

  // Simulate sanctions list check per jurisdiction
  for (const j of jurisdictions) {
    // In production: await complrClient.checkAddress(address, j)
    const clean = true; // placeholder
    if (!clean) {
      riskFactors.push(`Flagged by ${j} sanctions list`);
      riskScore += 40;
    }
  }

  return {
    address,
    riskScore: Math.min(riskScore, 100),
    riskLevel: riskScore > 60 ? "high" : riskScore > 30 ? "medium" : "low",
    riskFactors,
    jurisdictions,
    screenedAt: Date.now(),
    cleared: riskScore < 30,
  };
}

// ---------------------------------------------------------------------------
// Pool / protocol compliance screening
// ---------------------------------------------------------------------------

const KNOWN_COMPLIANT_PROTOCOLS = new Set([
  "kamino",
  "marginfi",
  "save",
  "meteora",
  "raydium",
  "orca",
  "jupiter",
  "jito",
  "marinade",
  "sanctum",
  "drift",
  "solblaze",
]);

export async function screenPool(
  protocol: string,
  poolId: string,
  jurisdictions: Jurisdiction[] = ["MAS", "FSA"]
): Promise<PoolComplianceResult> {
  const flags: string[] = [];

  // Protocol-level screening
  const isKnown = KNOWN_COMPLIANT_PROTOCOLS.has(protocol.toLowerCase());
  if (!isKnown) {
    flags.push(`Protocol "${protocol}" not in compliant registry`);
  }

  // Jurisdiction-level checks
  // In production: await complrClient.checkProtocol(protocol, jurisdictions)
  const jurisdictionResults = jurisdictions.map((j) => ({
    jurisdiction: j,
    compliant: isKnown, // placeholder — real check queries complr API
    notes: isKnown ? [] : [`${protocol} not verified for ${j}`],
  }));

  return {
    protocol,
    poolId,
    compliant: flags.length === 0,
    flags,
    jurisdictionResults,
    screenedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Compliance alerts for allocated pools
// ---------------------------------------------------------------------------

export function checkAllocationCompliance(
  allocations: Array<{ protocol: string; poolId: string; percentage: number }>
): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];

  for (const alloc of allocations) {
    if (!KNOWN_COMPLIANT_PROTOCOLS.has(alloc.protocol.toLowerCase())) {
      alerts.push({
        type: "unverified_protocol",
        severity: "warning",
        protocol: alloc.protocol,
        poolId: alloc.poolId,
        message: `${alloc.protocol} is not in the verified protocol registry. Allocation: ${alloc.percentage}%`,
        recommendation: "Consider replacing with a verified protocol.",
      });
    }

    // High concentration in single protocol
    if (alloc.percentage > 40) {
      alerts.push({
        type: "concentration_risk",
        severity: "info",
        protocol: alloc.protocol,
        poolId: alloc.poolId,
        message: `${alloc.percentage}% allocation in ${alloc.protocol} exceeds concentration guidelines.`,
        recommendation:
          "Diversify across multiple protocols to reduce single-protocol risk.",
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const compliance = {
  screenWallet,
  screenPool,
  checkAllocationCompliance,
};
