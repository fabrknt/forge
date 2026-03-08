export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ScoringCriteria {
    id: string;
    name: string;
    description: string;
    weight: number;
}

export interface ProtocolScore {
    protocol: string;
    slug: string;
    logo?: string;
    chain: string;
    category: string;
    tvl: string;
    jurisdiction: string;
    overallGrade: Grade;
    overallScore: number;
    scores: Record<string, { score: number; grade: Grade; note: string }>;
    lastUpdated: string;
}

export const SCORING_CRITERIA: ScoringCriteria[] = [
    {
        id: "kyc",
        name: "KYC/AML Controls",
        description:
            "Does the protocol enforce identity verification for users? Transfer restrictions? Accredited investor checks?",
        weight: 20,
    },
    {
        id: "sanctions",
        name: "Sanctions Screening",
        description:
            "Does the protocol screen wallets against OFAC SDN, UN, EU, and local sanctions lists before allowing transactions?",
        weight: 20,
    },
    {
        id: "travel_rule",
        name: "Travel Rule Compliance",
        description:
            "Does the protocol transmit originator/beneficiary data for transfers above jurisdiction thresholds (e.g., S$1,500 for MAS)?",
        weight: 15,
    },
    {
        id: "jurisdiction",
        name: "Jurisdiction Controls",
        description:
            "Does the protocol restrict access based on user jurisdiction? Are US, sanctioned countries, or unlicensed regions blocked?",
        weight: 15,
    },
    {
        id: "audit_trail",
        name: "Audit Trail & Reporting",
        description:
            "Can the protocol produce transaction records, compliance reports, or SAR/STR filings for regulators?",
        weight: 10,
    },
    {
        id: "governance",
        name: "Governance & Legal Structure",
        description:
            "Is there a legal entity behind the protocol? Is governance transparent? Are there responsible persons for compliance?",
        weight: 10,
    },
    {
        id: "disclosure",
        name: "Risk Disclosure",
        description:
            "Does the protocol disclose risks to users? Terms of service? Fee transparency? Smart contract audit status?",
        weight: 10,
    },
];

function gradeFromScore(score: number): Grade {
    if (score >= 85) return "A";
    if (score >= 70) return "B";
    if (score >= 55) return "C";
    if (score >= 40) return "D";
    return "F";
}

function calculateOverall(
    scores: Record<string, { score: number; grade: Grade; note: string }>
): { overallScore: number; overallGrade: Grade } {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const criteria of SCORING_CRITERIA) {
        const s = scores[criteria.id];
        if (s) {
            totalWeightedScore += s.score * criteria.weight;
            totalWeight += criteria.weight;
        }
    }
    const overallScore = Math.round(totalWeightedScore / totalWeight);
    return { overallScore, overallGrade: gradeFromScore(overallScore) };
}

function makeScores(
    raw: Record<string, [number, string]>
): Record<string, { score: number; grade: Grade; note: string }> {
    const result: Record<string, { score: number; grade: Grade; note: string }> = {};
    for (const [id, [score, note]] of Object.entries(raw)) {
        result[id] = { score, grade: gradeFromScore(score), note };
    }
    return result;
}

function buildProtocol(
    protocol: string,
    slug: string,
    chain: string,
    category: string,
    tvl: string,
    jurisdiction: string,
    raw: Record<string, [number, string]>,
    lastUpdated: string
): ProtocolScore {
    const scores = makeScores(raw);
    const { overallScore, overallGrade } = calculateOverall(scores);
    return {
        protocol,
        slug,
        chain,
        category,
        tvl,
        jurisdiction,
        overallGrade,
        overallScore,
        scores,
        lastUpdated,
    };
}

export const PROTOCOL_SCORES: ProtocolScore[] = [
    buildProtocol("Jupiter", "jupiter", "Solana", "DEX Aggregator", "$2.1B", "None (Decentralized)", {
        kyc: [5, "No KYC. Fully permissionless. Any wallet can swap."],
        sanctions: [10, "No sanctions screening. Sanctioned wallets can interact freely."],
        travel_rule: [0, "No Travel Rule implementation. No originator/beneficiary data transmitted."],
        jurisdiction: [15, "No geo-blocking. Accessible globally including sanctioned jurisdictions."],
        audit_trail: [30, "On-chain transaction history exists but no compliance reporting."],
        governance: [40, "JUP DAO governance. No legal entity. No compliance officer."],
        disclosure: [65, "Smart contract audits published. Fee structure visible on-chain."],
    }, "2026-03-07"),

    buildProtocol("Raydium", "raydium", "Solana", "AMM/DEX", "$1.4B", "None (Decentralized)", {
        kyc: [5, "No KYC. Fully permissionless."],
        sanctions: [5, "No sanctions screening whatsoever."],
        travel_rule: [0, "No Travel Rule compliance."],
        jurisdiction: [10, "No jurisdiction controls. Global access."],
        audit_trail: [25, "On-chain history only. No reporting tools."],
        governance: [25, "Anonymous team. No legal entity disclosed."],
        disclosure: [50, "Audited contracts but limited risk disclosure."],
    }, "2026-03-07"),

    buildProtocol("Orca", "orca", "Solana", "DEX (CLMM)", "$380M", "None (Decentralized)", {
        kyc: [5, "No KYC. Permissionless concentrated liquidity."],
        sanctions: [5, "No sanctions screening."],
        travel_rule: [0, "No Travel Rule."],
        jurisdiction: [20, "US restricted from some features via frontend."],
        audit_trail: [30, "On-chain records. No compliance reporting."],
        governance: [45, "Orca Foundation (BVI). Some governance transparency."],
        disclosure: [70, "Multiple audits. Clear documentation. Risk warnings on UI."],
    }, "2026-03-07"),

    buildProtocol("Marinade Finance", "marinade", "Solana", "Liquid Staking", "$1.5B", "None (Decentralized)", {
        kyc: [5, "No KYC for staking."],
        sanctions: [10, "No active sanctions screening."],
        travel_rule: [0, "Not applicable to staking but no compliance framework."],
        jurisdiction: [15, "No geo-restrictions."],
        audit_trail: [35, "Transparent validator delegation. On-chain audit trail."],
        governance: [55, "Marinade DAO with transparent governance. Foundation entity exists."],
        disclosure: [75, "Multiple audits. Validator scoring methodology published."],
    }, "2026-03-07"),

    buildProtocol("Drift Protocol", "drift", "Solana", "Perpetuals DEX", "$580M", "None (Decentralized)", {
        kyc: [10, "No KYC. Wallet-based access only."],
        sanctions: [15, "Basic frontend wallet screening via third-party."],
        travel_rule: [0, "No Travel Rule for perpetual futures."],
        jurisdiction: [30, "US users blocked from perpetual futures via frontend."],
        audit_trail: [35, "On-chain settlement. Partial reporting via subaccounts."],
        governance: [50, "DRIFT token governance. Drift Foundation exists."],
        disclosure: [60, "Audited. Risk parameters published. Leverage warnings."],
    }, "2026-03-07"),

    buildProtocol("Kamino Finance", "kamino", "Solana", "Lending/Vaults", "$1.8B", "None (Decentralized)", {
        kyc: [5, "No KYC. Permissionless lending and vault deposits."],
        sanctions: [10, "Minimal screening. Frontend-level only."],
        travel_rule: [0, "No Travel Rule."],
        jurisdiction: [20, "Some frontend restrictions."],
        audit_trail: [40, "On-chain lending records. Liquidation history transparent."],
        governance: [45, "KMNO token governance. No disclosed legal entity."],
        disclosure: [70, "Extensive documentation. Risk parameters transparent. Multiple audits."],
    }, "2026-03-07"),

    buildProtocol("Uniswap", "uniswap", "Ethereum", "DEX", "$5.2B", "Uniswap Labs (USA)", {
        kyc: [10, "No KYC on protocol. Labs frontend has some screening."],
        sanctions: [25, "Frontend screens OFAC-sanctioned wallets via TRM Labs."],
        travel_rule: [0, "No Travel Rule. Protocol is permissionless."],
        jurisdiction: [35, "Frontend restricts certain tokens and jurisdictions. Protocol unrestricted."],
        audit_trail: [35, "On-chain records. No compliance reporting tools."],
        governance: [65, "Uniswap Labs (US LLC) + Uniswap Foundation. Legal counsel. Lobby arm."],
        disclosure: [70, "Extensive audits. Bug bounties. Clear fee disclosure."],
    }, "2026-03-07"),

    buildProtocol("Aave", "aave", "Ethereum", "Lending", "$12.8B", "Aave Companies (UK)", {
        kyc: [15, "No KYC on main protocol. Aave Arc (discontinued) had permissioned pools."],
        sanctions: [30, "Frontend screens OFAC wallets. Aave Arc had Fireblocks KYC."],
        travel_rule: [0, "No Travel Rule on protocol level."],
        jurisdiction: [35, "Frontend geo-restrictions. Protocol permissionless."],
        audit_trail: [45, "Comprehensive on-chain records. Governance proposals documented."],
        governance: [75, "Aave Companies (UK). Aave DAO. Multiple legal entities. Active governance."],
        disclosure: [80, "Industry-leading audit history. Risk framework (Gauntlet). Clear documentation."],
    }, "2026-03-07"),

    buildProtocol("Lido", "lido", "Ethereum", "Liquid Staking", "$14.5B", "Lido DAO (Cayman)", {
        kyc: [5, "No KYC for staking."],
        sanctions: [15, "Limited frontend screening."],
        travel_rule: [0, "Not applicable but no framework."],
        jurisdiction: [20, "No meaningful geo-restrictions."],
        audit_trail: [40, "Transparent validator set. On-chain staking records."],
        governance: [45, "Lido DAO. Cayman entity. Court ruled DAO = general partnership (Samuels v. Lido)."],
        disclosure: [70, "Multiple audits. Validator economics transparent."],
    }, "2026-03-07"),

    buildProtocol("Hyperliquid", "hyperliquid", "Hyperliquid L1", "Perpetuals DEX", "$3.2B", "None (Decentralized)", {
        kyc: [5, "No KYC. Deposit and trade permissionlessly."],
        sanctions: [5, "No known sanctions screening."],
        travel_rule: [0, "No Travel Rule for derivatives."],
        jurisdiction: [10, "Minimal restrictions. US users actively trade."],
        audit_trail: [20, "Own L1. Limited external audit trail."],
        governance: [15, "Anonymous team. No legal entity. No governance token initially."],
        disclosure: [35, "Limited audit history. Risk disclosures minimal."],
    }, "2026-03-07"),

    buildProtocol("dYdX", "dydx", "dYdX Chain", "Perpetuals DEX", "$350M", "dYdX Trading Inc (USA)", {
        kyc: [20, "No protocol KYC but dYdX Trading restricts US users."],
        sanctions: [35, "Frontend sanctions screening. IP-based restrictions."],
        travel_rule: [5, "No Travel Rule but some data collection."],
        jurisdiction: [45, "Aggressive geo-blocking: US, Canada, UK restricted."],
        audit_trail: [40, "Cosmos-based chain. On-chain history. Governance transparent."],
        governance: [70, "dYdX Trading Inc (US). dYdX Foundation (Cayman). Multiple entities."],
        disclosure: [65, "Audited. Risk parameters documented. Leverage warnings."],
    }, "2026-03-07"),

    buildProtocol("Curve Finance", "curve", "Ethereum", "StableSwap DEX", "$1.8B", "Curve (Switzerland)", {
        kyc: [5, "No KYC. Fully permissionless."],
        sanctions: [10, "No active sanctions screening on protocol."],
        travel_rule: [0, "No Travel Rule compliance."],
        jurisdiction: [10, "No geo-restrictions."],
        audit_trail: [35, "On-chain records. veCRV governance transparent."],
        governance: [50, "Swiss entity. CRV/veCRV governance. Founder identified."],
        disclosure: [60, "Audited but complex codebase. Fee structure transparent."],
    }, "2026-03-07"),

    buildProtocol("GMX", "gmx", "Arbitrum", "Perpetuals DEX", "$620M", "None (Decentralized)", {
        kyc: [5, "No KYC. Wallet-based access."],
        sanctions: [10, "Minimal frontend screening."],
        travel_rule: [0, "No Travel Rule for derivatives."],
        jurisdiction: [25, "Some frontend geo-restrictions."],
        audit_trail: [30, "On-chain records. GLP/GM vault transparency."],
        governance: [30, "Pseudonymous team. No disclosed legal entity."],
        disclosure: [55, "Audited contracts. Risk parameters documented."],
    }, "2026-03-07"),

    buildProtocol("MakerDAO (Sky)", "maker", "Ethereum", "Stablecoin/Lending", "$8.5B", "Sky Ecosystem (Cayman)", {
        kyc: [25, "No KYC for DeFi users but RWA vaults require institutional KYC."],
        sanctions: [30, "OFAC compliance for RWA vaults. Famously froze Tornado Cash DAI."],
        travel_rule: [10, "Some institutional vaults have compliance requirements."],
        jurisdiction: [30, "No retail restrictions but RWA vaults are jurisdiction-aware."],
        audit_trail: [60, "Extensive governance records. MKR voter transparency. RWA reporting."],
        governance: [70, "Sky Ecosystem entities. Constitution. Multiple legal wrappers."],
        disclosure: [75, "Industry-leading transparency. Surplus buffer. Liquidation parameters published."],
    }, "2026-03-07"),

    buildProtocol("Ondo Finance", "ondo", "Multi-chain", "Tokenized RWA", "$2.5B", "Ondo Finance (USA)", {
        kyc: [85, "Full KYC required for OUSG and tokenized products. Accredited investor checks."],
        sanctions: [85, "OFAC and global sanctions screening for all participants."],
        travel_rule: [60, "Partial Travel Rule compliance through custodian partnerships."],
        jurisdiction: [80, "US accredited investors only for certain products. Clear geo-restrictions."],
        audit_trail: [75, "Custodian-grade reporting. NAV calculations. Transfer records."],
        governance: [80, "Ondo Finance Inc (US). Registered with regulators. Named leadership."],
        disclosure: [85, "SEC-aware. Prospectus-like disclosures. Custody details. Fee transparency."],
    }, "2026-03-07"),

    buildProtocol("DigiFT", "digift", "Ethereum/Solana", "Tokenized RWA", "$50M", "DigiFT (Singapore, MAS-licensed)", {
        kyc: [90, "Full KYC/AML. MAS-compliant onboarding for all users."],
        sanctions: [90, "Full OFAC + MAS + global sanctions screening."],
        travel_rule: [75, "Travel Rule compliant per MAS PSN02 requirements."],
        jurisdiction: [85, "Jurisdiction-aware. MAS + SFC licensed operations."],
        audit_trail: [80, "Regulatory-grade reporting. Audit-ready transaction records."],
        governance: [90, "Singapore Pte Ltd. MAS CMS license. Named directors and compliance officers."],
        disclosure: [85, "Prospectus-grade disclosure. Risk factors. Fee schedules."],
    }, "2026-03-07"),

    buildProtocol("HashKey Exchange", "hashkey", "Ethereum", "Exchange", "$200M", "HashKey Group (Hong Kong, SFC-licensed)", {
        kyc: [92, "Full KYC with tiered verification. SFC-mandated checks."],
        sanctions: [90, "Comprehensive sanctions screening per SFC requirements."],
        travel_rule: [80, "Travel Rule implementation for cross-border transfers."],
        jurisdiction: [85, "HK + SG dual-licensed. Clear jurisdiction restrictions."],
        audit_trail: [85, "Exchange-grade reporting. SFC audit requirements met."],
        governance: [90, "HashKey Group companies. SFC + MAS licensed. Named leadership."],
        disclosure: [85, "Full regulatory disclosure. Fee transparency. Risk warnings."],
    }, "2026-03-07"),

    buildProtocol("SBI VC Trade", "sbi-vc-trade", "Multi-chain", "Exchange", "$150M", "SBI VC Trade (Japan, FSA-registered)", {
        kyc: [95, "FSA-compliant full KYC. Japanese resident verification. My Number collection."],
        sanctions: [90, "JAFIC + global sanctions screening."],
        travel_rule: [85, "Travel Rule per FSA requirements. Zero threshold (strictest globally)."],
        jurisdiction: [90, "Japan-only service. Strict resident verification."],
        audit_trail: [90, "FSA-grade reporting. Regular regulatory submissions."],
        governance: [95, "SBI Holdings subsidiary. TSE-listed parent. Full corporate governance."],
        disclosure: [90, "FSA-mandated disclosures. Consumer protection. Fee transparency."],
    }, "2026-03-07"),

    buildProtocol("Compound", "compound", "Ethereum", "Lending", "$2.8B", "Compound Labs (USA)", {
        kyc: [10, "No KYC on protocol. Permissionless lending."],
        sanctions: [20, "Frontend-level OFAC screening."],
        travel_rule: [0, "No Travel Rule."],
        jurisdiction: [25, "Some frontend restrictions."],
        audit_trail: [45, "On-chain lending records. Governance history."],
        governance: [65, "Compound Labs (US). COMP governance. Named team."],
        disclosure: [70, "Extensively audited. Risk documentation. Oracle pricing published."],
    }, "2026-03-07"),

    buildProtocol("Jito", "jito", "Solana", "Liquid Staking/MEV", "$2.1B", "Jito Labs (USA)", {
        kyc: [5, "No KYC for staking or MEV."],
        sanctions: [10, "No sanctions screening on protocol."],
        travel_rule: [0, "Not applicable."],
        jurisdiction: [15, "No geo-restrictions."],
        audit_trail: [40, "Transparent MEV redistribution. Validator data public."],
        governance: [55, "Jito Labs (US). JTO governance. Foundation structure."],
        disclosure: [65, "Audited. MEV mechanics documented. Tip distribution transparent."],
    }, "2026-03-07"),
];

export const GRADE_COLORS: Record<Grade, { bg: string; text: string; border: string; glow: string }> = {
    A: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", glow: "shadow-green-500/20" },
    B: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
    C: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", glow: "shadow-yellow-500/20" },
    D: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/20" },
    F: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", glow: "shadow-red-500/20" },
};
