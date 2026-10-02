# Product

## What is Holdback?

Holdback is a Solana program that holds construction retention money in a vault no party controls. Every progress payment is split in one transaction: the subcontractor is paid at once, the retention (usually 5%) goes into the vault. Only the cost of a real defect can be frozen, a neutral arbiter settles disputes, the subcontractor can sell the locked claim for cash today, and after the warranty date anyone can release the money.

## Target Users

- **Subcontractors** (electrical, plumbing, finishing, facade): small firms whose margin is often smaller than the retention they wait 1–2 years for
- **Clients** (developers, general contractors): want a clean retention process, fewer disputes, a better tender score, and no retention bond to buy
- **Funders** (factoring firms, lenders, DeFi credit): buy locked claims at a discount, backed by money already in a vault
- **Arbiters** (site inspectors, technical supervision): settle defect disputes for a fee

First test market: Kazakhstan (Shymkent pilot). Larger markets with retention reform under way: the UK, New Zealand, Australia, the US.

## Core Value Propositions

1. **Retention cannot be sat on.** The money is not in the client's account, and anyone can release it after the warranty.
2. **Only the defect is frozen.** A $500 defect freezes $500, not the whole retention.
3. **Cash today.** The subcontractor can sell the claim; payment and change of ownership are one atomic transaction.
4. **Neutral by construction.** The subcontractor accepts the arbiter before any payment; a silent arbiter cannot block release forever.
5. **Transparent.** Every payment, defect and release is an on-chain event both sides can check.

## How It Differs from the Alternatives

| | Cash retention (today) | Retention bond | Escrow / trust account | Holdback |
|---|---|---|---|---|
| Who holds the money | Client | Client (bond replaces it) | Bank or trustee | Program vault, no key |
| Lost in client bankruptcy | Often | No, but bond costs a premium | Usually protected | Designed not to be (legal status unproven) |
| Release needs | Client's goodwill | Claim on the bond | Trustee's process | Anyone, after the date |
| Partial freeze for a defect | Rarely | No | Manual | Built in |
| Sell the claim for cash | Hard (factoring, paperwork) | No | No | One transaction |
| Cost per action | Bank fees, paperwork | 1–3% premium | Trustee fees | Under $0.001 on Solana + our fee |

## Business Model

A flat fee per contract (replacing a bond premium), a fee on claim sales, a small fee on the held amount, and later a share of vault yield. All of these are assumptions until interviews; numbers and break-even are in [BUSINESS-MODEL.md](BUSINESS-MODEL.md), market size in [MARKET-MODEL.md](MARKET-MODEL.md).

## Risks

- Clients may not agree to put retention in a vault they do not control (the biggest open question)
- Legal treatment of the vault in a bankruptcy is untested ([LEGAL.md](LEGAL.md))
- Stablecoin issuer can freeze the vault's token account ([THREAT-MODEL.md](THREAT-MODEL.md), T6)
- No audit yet

Short answers to the questions mentors and juries ask: [MENTOR-QA.md](MENTOR-QA.md).
