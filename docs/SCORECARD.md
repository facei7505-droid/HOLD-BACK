# Holdback scorecard (2 Oct 2026)

Scored with our project rubric: 5 stop-signals, then 10 weighted criteria on a 0–4 scale. "?" means no data (not zero). Weighted score = Σ(score × weight) / Σ(weights of scored criteria). Green ≥ 3.0, yellow 2.0–2.9, red < 2.0. The score is a map of weak spots, not a probability of winning.

## Stop-signals: all 5 passed

| # | Question | Answer |
|---|---|---|
| S1 | No concrete person with the pain? | Passed: the owner of a small subcontracting firm (electrical, finishing, windows) |
| S2 | Works just as well without a blockchain? | Passed: a vault nobody controls and automatic release need no trusted bank |
| S3 | Crowded niche with no winners and no angle? | Passed with care: generic escrow is crowded, but construction retention has 0 of 5,428 Colosseum projects |
| S4 | Legal blocker? | Passed for the hackathon (devnet, non-custodial). Open question: how a court treats the vault in a bankruptcy |
| S5 | Cannot build one scenario in 4–5 weeks? | Passed: the core is already built and tested |

## Score today

| # | Criterion | Weight | Score | Why |
|---|---|---|---|---|
| 1 | Sharp problem | 15 | 3 | Strong public data (UK £8 bn, US survey, NZ law, UK ban), but not verified in the target market |
| 2 | Proof of demand | 15 | ? | No interviews, no letters of intent yet |
| 3 | Market and growth | 10 | 2 | Size known for England only, no bottom-up estimate |
| 4 | Blockchain by necessity | 10 | 3 | Own Anchor program: atomic split, PDA vault, atomic claim sale, permissionless release. 7 tests pass. Not on devnet, not audited |
| 5 | Differentiation | 10 | 2 | 0 analogs in Colosseum, clear edge over bank trust, but customers have not confirmed it matters |
| 6 | Working product | 15 | 3 | Full flow works with UI, Blink and a recorded demo. Local network only, server signs for all roles |
| 7 | Access to customers | 10 | 1 | The team is students with no construction contacts yet |
| 8 | Team fit | 5 | 1 | Beginners, no domain expert |
| 9 | Money and sustainability | 5 | 2 | Model exists (0.5% of held amount + claim sale fee), price untested |
| 10 | One-line hook | 5 | 4 | "£8 bn of subcontractors' money went unpaid in 3 years" |

**Weighted score: 205 / 85 = 2.41, coverage 85%, yellow.**
If the unknown demand criterion is counted as 0: 205 / 100 = 2.05, still yellow.

## Fastest improvements (ranked by points gained per day of work)

| Action | Time | Criteria | Gain |
|---|---|---|---|
| 10 interviews (7 subcontractors, 3 developers), asking for concrete actions: show the retention clause, say how much is stuck and for how long, sign a letter of intent | 3–5 days | 2 → 3, 7 → 3, 1 → 4, 5 → 3, 9 → 3 | +45 +20 +15 +10 +5 = **+95 points** (counting the unknown demand criterion as 0 today) |
| Deploy to devnet with a real wallet (Phantom) and a public URL, replace the server-signed roles | 1–2 days | 6 → 4 | +15 |
| Bottom-up market estimate: number of firms × average contract × retention % × average months held | 0.5 day | 3: 2 → 3 | +10 |
| Add a construction advisor (even one person) to the team slide | 1 day | 8 → 2 | +5 |
| Share yield on locked funds between client and subcontractor (lending protocol integration) to answer "why would a client agree" | 3–4 days | 5, 9 | +10 |

**If the first three are done: 205 + 95 + 15 + 10 = 325 / 100 = 3.25, green.** Adding the advisor makes 330.

## Why it can compete at Colosseum (honest view)

- Stablecoin payment rails won a prize in 9.9% of cases (20 of 202) vs 5.4% overall.
- Industry-specific B2B rails have already won (CargoBill, 1st place Stablecoins).
- Own Anchor program (3× more common among winners), not a wrapper around Solana Pay (0 of 33 winners).
- Zero analogs in the database; hook with a verified number; demo you can see.
- Weak spots a judge will notice: unproven demand, local-only demo, beginner team.

Rough target if executed well: a prize of some kind about 10–15%, a track place 3–5%, accelerator 1–2%. These are estimates, not facts.
