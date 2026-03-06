/**
 * POST /api/fabrknt/dca
 *
 * @sentinel: Build a DCA plan for gradually entering a yield position.
 * Used when a user wants to dollar-cost average into their allocation.
 */

import { NextResponse } from "next/server";
import { sentinel } from "@/lib/fabrknt/sentinel";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pair, totalAmount, numberOfOrders, intervalMs, startTime } = body;

        if (!pair || !totalAmount || !numberOfOrders || !intervalMs) {
            return NextResponse.json(
                { error: "pair, totalAmount, numberOfOrders, and intervalMs are required" },
                { status: 400 }
            );
        }

        const plan = sentinel.buildDCAPlan({
            pair,
            totalAmount,
            numberOfOrders,
            intervalMs,
            startTime,
        });

        return NextResponse.json({
            ...plan,
            poweredBy: "@sentinel/core",
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "DCA plan failed" },
            { status: 500 }
        );
    }
}
