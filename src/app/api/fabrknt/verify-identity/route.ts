/**
 * POST /api/fabrknt/verify-identity
 *
 * @accredit: Check wallet KYC level and feature access.
 */

import { NextResponse } from "next/server";
import { identity } from "@/lib/fabrknt/identity";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, feature } = body;

        if (!address) {
            return NextResponse.json(
                { error: "address is required" },
                { status: 400 }
            );
        }

        const verification = await identity.verifyIdentity(address);
        const blacklisted = await identity.isBlacklisted(address);

        const response: Record<string, unknown> = {
            ...verification,
            blacklisted,
            poweredBy: "@accredit",
        };

        if (feature) {
            response.featureAccess = {
                feature,
                allowed: identity.canAccessFeature(verification, feature),
                requiredLevel: feature,
            };
        }

        return NextResponse.json(response);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Verification failed" },
            { status: 500 }
        );
    }
}
