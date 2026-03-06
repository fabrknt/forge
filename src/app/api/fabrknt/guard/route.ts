/**
 * POST /api/fabrknt/guard
 *
 * @sentinel: Validate a Solana transaction for security issues
 * before the user executes their allocation.
 */

import { NextResponse } from "next/server";
import { sentinel } from "@/lib/fabrknt/sentinel";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { transaction, mode = "warn", riskTolerance = "moderate" } = body;

        if (!transaction?.instructions) {
            return NextResponse.json(
                { error: "transaction with instructions array is required" },
                { status: 400 }
            );
        }

        const guard = sentinel.createGuard({ mode, riskTolerance });
        const result = await guard.validate(transaction);

        return NextResponse.json({
            ...result,
            poweredBy: "@sentinel/core",
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Guard validation failed" },
            { status: 500 }
        );
    }
}
