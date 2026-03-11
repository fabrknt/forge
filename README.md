# Forge

Personalized Solana DeFi allocations — with Fabrknt compliance, privacy, and data plug-ins integrated.

**Get your personalized yield allocation in 30 seconds, executed safely with plug-in compliance and privacy.**

## What is Forge?

Forge is a DeFi yield allocation app that demonstrates how Fabrknt plug-ins integrate into an existing protocol without rebuilding. It gives users personalized Solana yield allocations based on risk tolerance, with Fabrknt SDKs plugged in for compliance screening, identity verification, transaction security, private execution, and verifiable allocation proofs.

**Try → Track → Trust → Trade**

| Step | What Happens | Powered By |
|------|-------------|------------|
| **Try** | Get personalized allocation in 30 seconds | AI + Complr screening |
| **Track** | Paper Portfolio Dashboard monitors performance | Stratum proofs |
| **Trust** | 14+ days of tracking builds confidence | Veil encrypted history |
| **Trade** | Execute with guard rails and MEV protection | Sentinel + Accredit |

## Fabrknt SDK Integrations

Forge plugs in all 5 Fabrknt products. Each integration lives in `src/lib/fabrknt/` and is exposed via `/api/fabrknt/*` endpoints.

| Product | SDK | Integration | What it does in Forge |
|---------|-----|-------------|----------------------|
| **Sentinel** | `@sentinel/core` | `sentinel.ts` | Guard validates transactions with 17 pattern detectors (8 Solana + 9 EVM). DCA/rebalance/grid pattern builders. Jito + Flashbots bundle management for MEV protection. |
| **Complr** | `@complr` | `compliance.ts` | AI-powered screening (OFAC, TRM Labs, Chainalysis). Multi-jurisdiction checks (MAS/SFC/FSA). Confidence scoring. Human-in-the-loop review queue. |
| **Accredit** | `@accredit` | `identity.ts` | On-chain KYC via Token-2022 transfer hooks. Multi-provider KYC (Civic, World ID). Sovereign identity verification. |
| **Veil** | `@veil/core` | `privacy.ts` | NaCl Box encryption for allocation data. Shamir secret sharing for M-of-N access control. Noir ZK proofs for private sharing. |
| **Stratum** | `@stratum/core` | `data.ts` | Merkle tree proofs for verifiable allocation history. Bitfield tracking for efficient pool state management. 800x state reduction. |

### Integration Architecture

```
User Request
    │
    ├── /api/curate/ai/recommendations
    │       ├── AI yield advisor (Claude)
    │       └── @complr: screen pools before recommending
    │
    ├── /api/fabrknt/guard
    │       └── @sentinel: validate transaction security (17 patterns)
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
| `/api/fabrknt/guard` | POST | Sentinel | Validate transaction for 17 security patterns |
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

### Compliance

| Product | What it does in Forge |
|---------|----------------------|
| **Complr** | AI-powered screening (OFAC, TRM Labs, Chainalysis). SAR/STR generation. Confidence scoring. |
| **Accredit** | On-chain KYC via transfer hooks. Multi-provider verification (Civic, World ID). Sovereign identity. |
| **Sentinel** | Guards transactions with 17-pattern detection. Simulation sandbox. DCA/rebalance/grid builders. Jito + Flashbots bundles. |

### Privacy

| Product | What it does in Forge |
|---------|----------------------|
| **Veil** | NaCl encryption for allocation data. Shamir sharing for access control. Noir ZK proofs. |

### Data

| Product | What it does in Forge |
|---------|----------------------|
| **Stratum** | Merkle proofs for verifiable allocation history. Bitfield for pool state tracking. 800x state reduction. |

All products live in [fabrknt/api](https://github.com/fabrknt/api).

## License

MIT
