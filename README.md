# Forge

Personalized Solana DeFi allocations — powered by the Fabrknt infrastructure suite.

**Get your personalized yield allocation in 30 seconds, executed safely with full compliance and privacy.**

## What is Forge?

Forge is Fabrknt's flagship DeFi app and the reference implementation for the entire product suite. It gives users personalized Solana yield allocations based on risk tolerance, then uses Fabrknt's own SDKs for compliance screening, identity verification, transaction security, private execution, and verifiable allocation proofs.

**Try → Track → Trust → Trade**

| Step | What Happens | Powered By |
|------|-------------|------------|
| **Try** | Get personalized allocation in 30 seconds | AI + Complr screening |
| **Track** | Paper Portfolio Dashboard monitors performance | Stratum proofs |
| **Trust** | 14+ days of tracking builds confidence | Veil encrypted history |
| **Trade** | Execute with guard rails and MEV protection | Sentinel + Accredit |

## Fabrknt SDK Integrations

Forge dogfoods all 5 Fabrknt products. Each integration lives in `src/lib/fabrknt/` and is exposed via `/api/fabrknt/*` endpoints.

| Product | SDK | Integration | What it does in Forge |
|---------|-----|-------------|----------------------|
| **Sentinel** | `@sentinel/core` | `sentinel.ts` | Guard validates transactions before execution. DCA/rebalance/grid pattern builders drive the Trade step. Jito tips provide MEV-protected execution. |
| **Complr** | `@complr` | `compliance.ts` | Screens wallets during onboarding. Checks pools against regulatory lists before recommending. Generates compliance alerts for allocated positions. |
| **Accredit** | `@accredit` | `identity.ts` | Verifies KYC level from on-chain PDAs. Gates features by verification tier. Blacklist screening before transactions. |
| **Veil** | `@veil/crypto` | `privacy.ts` | Encrypts user allocation data at rest. Shamir secret sharing for M&A data room access. Private allocation sharing without revealing identity. |
| **Stratum** | `@stratum/core` | `data.ts` | Merkle tree proofs for verifiable allocation history. Bitfield tracking for efficient pool state management. |

### Integration Architecture

```
User Request
    │
    ├── /api/curate/ai/recommendations
    │       ├── AI yield advisor (Claude)
    │       └── @complr: screen pools before recommending
    │
    ├── /api/fabrknt/guard
    │       └── @sentinel: validate transaction security (8 patterns)
    │
    ├── /api/fabrknt/dca
    │       └── @sentinel: build DCA schedule for gradual entry
    │
    ├── /api/fabrknt/rebalance
    │       ├── @sentinel: generate concrete rebalance trades
    │       └── @complr: screen trades for compliance
    │
    ├── /api/fabrknt/screen-wallet
    │       └── @complr: sanctions/risk screening
    │
    ├── /api/fabrknt/verify-identity
    │       └── @accredit: KYC level + feature gating
    │
    └── /api/fabrknt/tip
            └── @sentinel: Jito tip for MEV protection
```

### Rebalance Detector

The rebalance detector (`src/lib/curate/rebalance-detector.ts`) combines Forge's own APY/risk monitoring with:

- **@complr** `checkAllocationCompliance()` — flags unverified protocols and concentration risk
- **@sentinel** `buildRebalancePlan()` — generates actionable trade lists when rebalancing is needed

## Core Features

### Get Started
- Enter investment amount and risk tolerance (Preserver → Maximizer)
- Get personalized pool recommendations with expected yields
- Paper Portfolio Dashboard tracks performance over time

### Insights
- Rebalance alerts with compliance screening
- Curator strategies (Gauntlet, Steakhouse, RE7)
- Six curation principles for yield selection

### Explore
- Browse pools with filtering by protocol, risk, TVL
- APY change alerts and watchlists
- Pool comparison and historical backtesting

### Practice
- Strategy Builder with A-F grading
- Scenario Simulator (crash, correction, bull run, depeg)
- Import your allocation with one click

### Compare
- Your allocation vs professional curators
- Protocol/LST comparison tools
- Yield spreads and IL calculator

## API Endpoints

### Fabrknt Integration (`/api/fabrknt/*`)

| Endpoint | Method | SDK | Description |
|----------|--------|-----|-------------|
| `/api/fabrknt` | GET | — | Integration status dashboard |
| `/api/fabrknt/guard` | POST | Sentinel | Validate transaction for 8 security patterns |
| `/api/fabrknt/dca` | POST | Sentinel | Build DCA execution schedule |
| `/api/fabrknt/rebalance` | POST | Sentinel + Complr | Generate rebalance trades with compliance check |
| `/api/fabrknt/tip` | GET | Sentinel | Jito tip account for MEV protection |
| `/api/fabrknt/screen-wallet` | POST | Complr | Wallet sanctions/risk screening |
| `/api/fabrknt/verify-identity` | POST | Accredit | KYC verification + feature access check |

### Curate (`/api/curate/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/curate/defi` | GET | Yield pools with risk scoring |
| `/api/curate/defi/history/{poolId}` | GET | Historical APY data |
| `/api/curate/protocols` | GET | Protocol comparison |
| `/api/curate/spreads` | GET | Yield spread opportunities |
| `/api/curate/curators` | GET | Curator profiles |
| `/api/curate/curators/{slug}` | GET | Curator strategies |
| `/api/curate/backtest` | POST | Historical performance backtesting |
| `/api/curate/ai/recommendations` | POST | AI recommendations (with @complr screening) |
| `/api/curate/ai/insights/{poolId}` | GET | AI pool analysis |
| `/api/curate/ai/portfolio` | POST | Portfolio optimization |

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **AI:** Anthropic Claude API
- **Database:** PostgreSQL (Supabase) via Prisma
- **Hosting:** Vercel
- **Data Sources:** DeFiLlama, Fragmetric, Jupiter, on-chain data
- **Fabrknt SDKs:** Sentinel, Complr, Accredit, Veil, Stratum

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev        # http://localhost:3000
pnpm type-check
pnpm build
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Fabrknt Product Suite

| Product | Slug | Repo | Scope |
|---------|------|------|-------|
| On-Chain Compliance | fabrknt-onchain-compliance | accredit | KYC/AML, identity, transfer hooks |
| Off-Chain Compliance | fabrknt-offchain-compliance | complr | Screening, SAR/STR, regulatory queries |
| Data Optimization | fabrknt-data-optimization | stratum | Merkle trees, bitfields, order matching |
| Privacy | fabrknt-privacy | veil | Encryption, Shamir, ZK compression |
| DeFi Toolkit | fabrknt-defi-toolkit | sentinel | Guard, patterns, Jito bundles |
| **Forge** | — | **forge** | **Reference app dogfooding all 5 products** |

## License

MIT
