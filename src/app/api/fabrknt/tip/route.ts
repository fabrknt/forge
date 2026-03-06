/**
 * GET /api/fabrknt/tip
 *
 * @sentinel: Get Jito tip info for MEV-protected execution.
 */

import { NextResponse } from "next/server";
import { sentinel } from "@/lib/fabrknt/sentinel";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const level = (searchParams.get("level") ?? "medium") as "low" | "medium" | "high" | "very_high" | "turbo";
    const region = searchParams.get("region") ?? "default";

    const tip = sentinel.getTipInfo(level, region);

    return NextResponse.json({
        ...tip,
        poweredBy: "@sentinel/core",
    });
}
