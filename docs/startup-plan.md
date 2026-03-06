# Fabrknt Startup Plan

## Overview

Fabrknt provides blockchain compliance and privacy infrastructure as a service, distributed via QuickNode Marketplace add-ons and a standalone API platform.

### Product Suite

| Add-On | Slug | Repo | Scope |
|--------|------|------|-------|
| Fabrknt On-Chain Compliance | fabrknt-onchain-compliance | accredit | Solana KYC/AML whitelist, identity scores, trust assessment, route compliance, ZK proofs |
| Fabrknt Off-Chain Compliance | fabrknt-offchain-compliance | complr | AI-powered regulatory queries, transaction checks, SAR/STR reporting, address screening |
| Fabrknt Data Optimization | fabrknt-data-optimization | stratum | Merkle trees, bitfields for multi-chain state optimization |
| Fabrknt Privacy | fabrknt-privacy | veil | NaCl encryption, Shamir secret sharing, encrypted orders, ZK compression |
| Fabrknt DeFi Toolkit | fabrknt-defi-toolkit | sentinel | Transaction guard (8 patterns), execution patterns (DCA, rebalance, grid), Jito bundle management |

### Reference Application

| App | Repo | Purpose |
|-----|------|---------|
| Forge | forge | Flagship DeFi yield allocation app, dogfoods all 5 products above |

### Founder Profile

- Japanese national, age 56
- Currently at SBI R3 Japan (enterprise blockchain, Corda, regulated financial infrastructure)
- Lived in Hong Kong for 2 years
- Family: wife (English teacher), children ages 14 and 9
- Willing to relocate to Singapore

---

## Jurisdiction: Singapore

### Why Singapore

- MAS is the gold standard for crypto regulation — Fabrknt's compliance products already cover MAS. Operating under MAS jurisdiction gives compliance products instant credibility
- SBI has deep Singapore presence (SBI Digital Asset Holdings, SBI VCTrade). Existing R3 network transfers directly
- QuickNode, Solana Foundation, and most crypto infra companies have APAC hubs in Singapore
- Family-friendly: excellent schools (SJIS, international schools), safe, healthcare, direct flights to Tokyo (7h)
- Tax: 17% corporate rate, no capital gains tax, Japan-Singapore tax treaty avoids double taxation
- Startup ecosystem: EntrePass visa for founders, Enterprise Singapore grants, strong crypto VC presence

### Corporate Structure

```
Fabrknt Pte. Ltd.  (Singapore)
+-- HQ, contracts, billing, IP ownership
+-- QuickNode Marketplace publisher entity
+-- MAS regulatory relationship
```

---

## Family Relocation Plan

### Wife

- Dependant's Pass (tied to EntrePass) with Letter of Consent to work
- English teaching in high demand in Singapore: international schools, language centers (British Council, EF), private tutoring, corporate English training for Japanese expats

### Children

**14-year-old (secondary school):**
- Option A: SJIS (Japanese School in Singapore) — continues Japanese curriculum, easier social transition. Goes up to Chuugaku 3 (JHS3). After that, transition to international school or return to Japan for high school
- Option B: International school — full English immersion, IB curriculum, harder social adjustment but better long-term global path
- Recommendation: International school if budget allows (S$20-40K/year). Wife's English teaching background provides strong home support

**9-year-old (primary school):**
- Adapts easily at this age. Either SJIS or international school works
- Younger children pick up English and integrate faster

---

## Phased Execution Plan

### Phase 0: Validation (Months 1-3, from Tokyo)

Keep SBI R3 job. No risk yet.

**Customer discovery (evenings/weekends):**
- Identify 20 DeFi protocols operating in MAS/SFC/FSA jurisdictions
- Reach out to 20 teams — ask what compliance pain they have, what they'd pay for
- Target: 5 LOIs (letters of intent) or verbal commitments at $99-500/month
- Attend Token2049 Singapore or similar events for in-person meetings

**Product validation:**
- Deploy all 5 QN add-ons to QuickNode Marketplace (submission process)
- Track free-tier usage to gauge organic demand
- Set up landing page at fabrknt.com — explain product suite, collect waitlist emails

**Financial preparation:**
- Calculate runway: how many months family can live on savings without salary
- Target: 12-18 months of living expenses saved before leaving SBI R3
- Research EntrePass requirements, prepare business plan draft

**Go/no-go decision:** If 5+ interested customers and 12+ months runway, proceed.

### Phase 1: Incorporate & Launch (Months 4-6)

**Singapore incorporation (Week 1-2):**
- Incorporate Fabrknt Pte. Ltd. via corporate secretary (Sleek, Osome, or law firm)
- Cost: S$1-2K incorporation + S$2-3K/year for registered address, local director, secretary
- Open corporate bank account (DBS or OCBC — both crypto-friendly)
- Set up Stripe or Paddle for SaaS billing

**IP assignment:**
- Assign all repo IP to Fabrknt Pte. Ltd. via IP assignment agreement
- Important for tax, fundraising, and credibility

**QuickNode Marketplace go-live:**
- Submit all 5 add-ons for QN review
- Publisher entity = Fabrknt Pte. Ltd.
- Target: live on marketplace by end of Month 5

**Standalone API (parallel track):**
- Deploy api.fabrknt.com — same endpoints, own auth (API keys), usage-based billing
- QN-independent revenue channel
- Use Cloudflare Workers or Railway for hosting, Stripe for metered billing

Still employed at SBI R3. Building on the side. Singapore company is operational but not drawing salary from it yet.

### Phase 2: First Revenue & Transition (Months 7-12)

**Sales (from Tokyo, traveling to Singapore/HK as needed):**
- Convert LOIs to paying customers
- Target: 10 paying customers, S$5-10K MRR
- Focus on DeFi protocols in Singapore/HK needing MAS/SFC compliance
- Leverage SBI R3 network — warm intros to SBI portfolio companies, R3 Corda ecosystem partners

**Product iteration:**
- Build proprietary sanctions/PEP screening database (replaces raw LLM calls)
- Add webhook notifications for compliance alerts
- Build dashboard for customers to monitor compliance status
- These features create switching costs and defensibility

**Team:**
- Hire 1 part-time engineer (contract, can be remote)
- Consider Singapore-based BD/sales person (part-time or advisor with equity)

**Resignation decision (Month 9-10):**
- If MRR >= S$5K and growing, give notice at SBI R3
- Standard notice period in Japan: 1-3 months
- Target: leave SBI R3 by Month 12

### Phase 3: Full-time & Relocation (Months 13-18)

**EntrePass application (Month 13):**
- Apply with: Fabrknt Pte. Ltd. already incorporated and revenue-generating, business plan, SBI R3 background as domain credibility, revenue traction and customer logos
- Processing: 8-12 weeks
- Given low relocation friction, can relocate as early as Month 13-14 if EntrePass comes through and MRR supports it

**Family relocation (Month 13-16):**
- Research and apply to schools (SJIS or international)
- Housing: areas near chosen school or CBD
- Wife explores teaching opportunities on Dependant's Pass

**Founder operations:**
- Full-time founder/CEO, on the ground in Singapore
- Start drawing founder salary (S$5-8K/month, keep lean)

**If EntrePass is delayed or denied:**
- Continue operating from Tokyo with Singapore entity
- Hire Singapore-resident co-founder or employee (alternative visa path)
- Reapply with stronger traction

### Phase 4: Scale (Months 19-24)

**Revenue targets:**
- Month 18: S$15-20K MRR (20-30 paying customers)
- Month 24: S$50K MRR

**Fundraising (if needed, Month 18-20):**
- Pre-seed/Seed: S$500K-1.5M
- Target investors: Singapore crypto VCs (Signum Capital, Spartan Group, DeFiance Capital), Japanese VCs with Singapore presence (SBI Investment, GMO Venture Partners, Headline Asia)
- SBI R3 background + revenue traction + Singapore incorporation = strong pitch

**Product expansion:**
- Add EVM chain support for on-chain compliance (beyond Solana)
- SOC 2 Type I certification (S$30-50K, 3-6 months, essential for enterprise sales)
- Partnerships with law firms specializing in crypto regulation in APAC

**Team (by Month 24):**
- 2-3 engineers (can be remote, SEA timezone)
- 1 BD/sales (Singapore-based)
- 1 compliance advisor (part-time, ex-regulator or compliance officer)

---

## Financial Summary

| Phase | Period | Monthly Burn | Revenue | Funding Source |
|-------|--------|-------------|---------|---------------|
| 0 - Validate | M1-3 | S$500 | S$0 | Personal (side project) |
| 1 - Incorporate | M4-6 | S$1.5K | S$0-1K | Personal savings |
| 2 - First Revenue | M7-12 | S$3-5K | S$1-10K | Revenue + savings |
| 3 - Full-time | M13-18 | S$15-20K | S$10-20K | Revenue + savings |
| 4 - Scale | M19-24 | S$40-60K | S$20-50K | Revenue + seed round |

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| No customers after validation | Don't quit SBI R3. Pivot or stop at Phase 0 |
| EntrePass denied | Operate from Tokyo with Singapore entity. Many founders do this |
| QN Marketplace doesn't drive traffic | Standalone API + direct sales. QN is a channel, not the business |
| Family resists relocation | Stay in Tokyo. Singapore company runs fine with a local director |
| Age bias from VCs | Lead with revenue, not fundraising. A profitable company doesn't need VC permission |
| Runway runs out | Keep 6 months buffer at all times. Cut to Phase 2 scope if needed |
| Thin moat (wrapping known crypto/LLM APIs) | Build proprietary sanctions/PEP database, compliance certifications (SOC 2), integration depth |
| Compliance credibility gap | SOC 2 certification, partnerships with compliance firms, leverage SBI R3 background |
| Accredit is Solana-only | Expand on-chain compliance to EVM chains in Phase 4 |
| QN dependency for distribution | Build standalone api.fabrknt.com in Phase 1 as parallel channel |

---

## Month 1 Action Items

1. Register fabrknt.com domain
2. Submit 5 add-ons to QuickNode Marketplace
3. List 20 target DeFi protocols in APAC
4. Send 10 outreach messages this week
5. Talk to wife about the plan and timeline
