/**
 * POST /api/fabrknt/rebalance
 *
 * @sentinel: Generate concrete rebalance trades from current vs target allocation.
 * @complr: Screen resulting trades for compliance before execution.
 */

import { NextResponse } from "next/server";
import { sentinel } from "@/lib/fabrknt/sentinel";
import { compliance } from "@/lib/fabrknt/compliance";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { targetAllocations, currentHoldings, rebalanceThreshold = 5 } = body;

        if (!targetAllocations || !currentHoldings) {
            return NextResponse.json(
                { error: "targetAllocations and currentHoldings are required" },
                { status: 400 }
            );
        }

        const plan = sentinel.buildRebalancePlan({
            targetAllocations,
            currentHoldings,
            rebalanceThreshold,
        });

        // Screen trades for compliance
        const complianceAlerts = compliance.checkAllocationCompliance(
            Object.entries(targetAllocations).map(([token, data]) => ({
                protocol: token,
                poolId: token,
                percentage: (data as { percentage: number }).percentage,
            }))
        );

        return NextResponse.json({
            ...plan,
            complianceAlerts,
            poweredBy: ["@sentinel/core", "@complr"],
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Rebalance plan failed" },
            { status: 500 }
        );
    }
}
