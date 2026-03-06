import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getYieldAdvisor } from "@/lib/ai/yield-advisor";
import { UserPreferences } from "@/lib/ai/types";
import { fetchAllPoolsForAI } from "@/lib/curate/fetch-pools";
import { compliance } from "@/lib/fabrknt/compliance";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const advisor = getYieldAdvisor();

        if (!advisor.isAvailable()) {
            return NextResponse.json(
                { error: "AI service unavailable", code: "AI_UNAVAILABLE" },
                { status: 503 }
            );
        }

        const body = await request.json();
        const preferences: UserPreferences = {
            riskTolerance: body.preferences?.riskTolerance || "moderate",
            preferredChains: body.preferences?.preferredChains || [],
            minApy: body.preferences?.minApy ?? 0,
            maxApy: body.preferences?.maxApy ?? 100,
            stablecoinOnly: body.preferences?.stablecoinOnly ?? false,
            maxAllocationUsd: body.preferences?.maxAllocationUsd,
        };

        // Fetch pools from DeFiLlama + alternative yields (restaking, perp LP)
        const pools = await fetchAllPoolsForAI({ limit: 100, minTvl: 1_000_000, includeAlternativeYields: true });

        // Get recommendations from AI
        const result = await advisor.getPersonalizedRecommendations(pools, preferences);

        // Enrich recommendations with full pool data
        const enrichedRecommendations = result.recommendations.map(rec => {
            const pool = pools.find(p => p.id === rec.poolId);
            return {
                ...rec,
                pool: pool || null,
            };
        }).filter(rec => rec.pool !== null);

        // @complr: screen recommended pools for compliance
        const complianceAlerts = compliance.checkAllocationCompliance(
            enrichedRecommendations.map(rec => ({
                protocol: rec.pool?.protocol || "unknown",
                poolId: rec.poolId,
                percentage: rec.allocationPercentage ?? 0,
            }))
        );

        return NextResponse.json({
            recommendations: enrichedRecommendations,
            preferenceSummary: result.preferenceSummary,
            complianceAlerts: complianceAlerts.length > 0 ? complianceAlerts : undefined,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Failed to generate recommendations:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to generate recommendations",
                code: "GENERATION_FAILED",
            },
            { status: 500 }
        );
    }
}
