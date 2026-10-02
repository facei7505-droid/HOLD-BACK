# Business model (honest version)

Facts are sourced. Everything marked **A** is our assumption, to be replaced by interview answers. Numbers here use the same inputs as [MARKET-MODEL.md](MARKET-MODEL.md).

## Who pays and why

| Party | What they get | Pays? |
|---|---|---|
| Subcontractor | Retention that cannot be delayed, spent or lost in the client's bankruptcy; option to sell the claim for cash today | Yes, a share of the fee on cash-out (claim sale) |
| Client (developer, general contractor) | Clean retention process, fewer disputes, a better tender score ("fair retention"), no retention bond to buy | Yes, a flat fee per contract (replaces a retention bond premium) |
| Funder (buys claims) | About 11% return over the holding period on a claim backed by money already in a vault | No: the discount is their return |
| Arbiter (site inspector) | Fee per settled defect, paid by whoever agrees to it in the contract | Off-chain, not our revenue |

**Why a client agrees at all** is the weakest link (it is also the biggest risk in the scorecard). Three honest answers, none yet tested with a real client: (1) it replaces a retention bond, which already costs them money; (2) public tenders in some countries now score retention practice; (3) the vault can earn yield for the client (below). Interviews must test this first.

## Revenue lines (per contract, avg retention $10,000, held 12 months)

| # | Line | Formula | Per contract | Type |
|---|---|---|---|---|
| R1 | Fee on held amount | 0.5% × $10,000 × 1 year | **$50** | A (pricing hypothesis) |
| R2 | Claim-sale platform fee | 1.5% × $9,000 sale price × 10% of contracts sell early | **$13.5** (average) | A |
| R3 | Flat contract fee (client side, replaces a bond premium) | fixed | **$75** | A |
| R4 | Share of vault yield (lending integration, not built) | 20% × 4.5% APY × $10,000 | **$90** | A; needs integration and a risk review |

The funder's return is not our revenue: 10% discount on 10% of contracts is about $100 per contract of value that moves to funders.

Totals per contract per year: R1+R2 only = **$63.5**; R1+R2+R3 = **$138.5**; all four = **$228.5**.

## The honest conclusion

A fee on the held amount alone is a thin business: $50 a year on a $200,000 subcontract. Transaction cost on Solana is not the issue (under $0.001 per action); sales and support cost is. So:

1. **Do not pitch "0.5% of the vault" as the model.** Pitch infrastructure plus three revenue lines (flat fee, cash-out fee, yield share), with the flat fee carrying the pilot.
2. **Break-even** for a three-person team with $108,000 a year of costs (A: $3,000 a month each):

| Revenue per contract | Contracts per year to break even | Share of the Kazakhstan market (about 21,400 contracts a year at $10,000 each) |
|---|---|---|
| $63.5 (R1+R2) | about 1,700 | 7.9% |
| $138.5 (R1+R2+R3) | about 780 | 3.6% |
| $228.5 (all four) | about 470 | 2.2% |

3. **Kazakhstan is a pilot, not the market.** Its whole fee pool at 0.5% is about $1 m a year. England alone is £16–30 m a year at the same fee ([MARKET-MODEL.md](MARKET-MODEL.md)), the US is larger, and New Zealand and Australia already have retention-trust laws that make adoption easier.

## Go-to-market sequence

| Stage | Where | Goal | Revenue |
|---|---|---|---|
| Pilot | Shymkent, 3 developers and 10 subcontractors | 20 real contracts on devnet, then mainnet with small amounts | None; learn price |
| Year 1 | Kazakhstan plus one English-speaking market | 100–500 contracts | $7k–$70k |
| Year 2–3 | New Zealand, Australia, UK, US states | 3,000+ contracts | $190k–$690k |

All three stages are plans, not forecasts.

## What the program does and does not do today

- The program has **no fee mechanism yet**. A fee taken atomically at release (a `fee_bps` on the released amount, capped, paid to a treasury account) is the planned first change. Until it exists, revenue is zero by construction, which also means nothing in this document is a measured number.
- Yield share (R4) needs a lending-protocol integration, a custody and legal review, and is not built.
- Claim sales (R2) exist in the program with no fee.

## What would change the model

| If we learn | Then |
|---|---|
| Clients will not accept a fee at all | Charge only the subcontractor at cash-out (R2), raise it to 2–3% of the sale price |
| Clients accept a bond-substitute fee | Charge a flat percentage (1–2% of retention) like a bond premium, raising R3 |
| Retention is 10% not 5% | Everything per contract doubles |
| Average subcontract is $50,000 not $200,000 | Everything per contract falls by 4× and the flat fee becomes the only viable line |
