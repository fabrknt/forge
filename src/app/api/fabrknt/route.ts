/**
 * GET /api/fabrknt
 *
 * Fabrknt SDK integration status — shows which products are active
 * and provides endpoints for each integration.
 */

import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        name: "Forge by Fabrknt",
        description: "DeFi yield allocation platform powered by the Fabrknt infrastructure suite",
        integrations: {
            sentinel: {
                status: "active",
                description: "Transaction guard, execution patterns (DCA, rebalance, grid), Jito bundles",
                endpoints: [
                    "POST /api/fabrknt/guard — Validate a transaction for security issues",
                    "POST /api/fabrknt/dca — Build a DCA execution plan",
                    "POST /api/fabrknt/rebalance — Generate rebalance trades from current allocation",
                    "GET  /api/fabrknt/tip — Get Jito tip info for MEV-protected execution",
                ],
            },
            complr: {
                status: "active",
                description: "Off-chain compliance screening for wallets and pools",
                endpoints: [
                    "POST /api/fabrknt/screen-wallet — Screen wallet against sanctions lists",
                    "POST /api/fabrknt/screen-pool — Verify pool compliance status",
                ],
            },
            accredit: {
                status: "active",
                description: "On-chain KYC/AML verification and feature gating",
                endpoints: [
                    "POST /api/fabrknt/verify-identity — Check wallet KYC level",
                    "POST /api/fabrknt/check-access — Verify feature access for wallet",
                ],
            },
            veil: {
                status: "active",
                description: "Encryption for allocations and private sharing",
                endpoints: [
                    "POST /api/fabrknt/encrypt-allocation — Encrypt allocation data",
                    "POST /api/fabrknt/share — Create private share link",
                ],
            },
            stratum: {
                status: "active",
                description: "Merkle proofs for allocation history, bitfield pool tracking",
                endpoints: [
                    "POST /api/fabrknt/prove-allocation — Generate Merkle proof for allocation",
                ],
            },
        },
    });
}
