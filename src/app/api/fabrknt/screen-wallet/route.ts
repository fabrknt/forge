/**
 * POST /api/fabrknt/screen-wallet
 *
 * @complr: Screen a wallet address against sanctions and risk lists.
 */

import { NextResponse } from "next/server";
import { compliance } from "@/lib/fabrknt/compliance";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, jurisdictions } = body;

        if (!address) {
            return NextResponse.json(
                { error: "address is required" },
                { status: 400 }
            );
        }

        const result = await compliance.screenWallet(address, jurisdictions);

        return NextResponse.json({
            ...result,
            poweredBy: "@complr",
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Screening failed" },
            { status: 500 }
        );
    }
}
