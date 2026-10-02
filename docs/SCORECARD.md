# Holdback scorecard (2 Oct 2026, updated after the second work session)

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
| 3 | Market and growth | 10 | 3 | Bottom-up model built ([MARKET-MODEL.md](MARKET-MODEL.md)): sourced output of 10.7 trillion ₸ (+15.9%), assumptions marked. Finding: Kazakhstan alone is about a $1 m fee pool, so the pitch must stay global |
| 4 | Blockchain by necessity | 10 | 3 | Own Anchor program: atomic split, PDA vault, atomic claim sale, permissionless release. 7 tests pass. Not on devnet, not audited |
| 5 | Differentiation | 10 | 2 | 0 analogs in Colosseum, clear edge over bank trust, but customers have not confirmed it matters |
| 6 | Working product | 15 | 3 | Full flow works with UI, Blink, a public simulation site and 15 passing tests (edge cases, classic SPL Token and Token-2022). Local network only, server signs for all roles, not on devnet |
| 7 | Access to customers | 10 | 1 | The team is students with no construction contacts yet |
| 8 | Team fit | 5 | 1 | Beginners, no domain expert |
| 9 | Money and sustainability | 5 | 2 | Model exists (0.5% of held amount + claim sale fee), price untested |
| 10 | One-line hook | 5 | 4 | "£8 bn of subcontractors' money went unpaid in 3 years" |

**Weighted score: 215 / 85 = 2.53, coverage 85%, yellow** (was 2.41).
If the unknown demand criterion is counted as 0: 215 / 100 = 2.15, still yellow.

## Fastest improvements (ranked by points gained per day of work)

| Action | Time | Criteria | Gain |
|---|---|---|---|
| 10 interviews (7 subcontractors, 3 developers), asking for concrete actions: show the retention clause, say how much is stuck and for how long, sign a letter of intent | 3–5 days | 2 → 3, 7 → 3, 1 → 4, 5 → 3, 9 → 3 | +45 +20 +15 +10 +5 = **+95 points** (counting the unknown demand criterion as 0 today) |
| Deploy to devnet with a real wallet (Phantom) and a public URL, replace the server-signed roles | 1–2 days | 6 → 4 | +15 |
| ~~Bottom-up market estimate~~ done: [MARKET-MODEL.md](MARKET-MODEL.md) and a calculator on the site | done | 3: 2 → 3 | +10 (already in the score above) |
| Add a construction advisor (even one person) to the team slide | 1 day | 8 → 2 | +5 |
| Share yield on locked funds between client and subcontractor (lending protocol integration) to answer "why would a client agree" | 3–4 days | 5, 9 | +10 |

**If interviews and devnet are done: 215 + 95 + 15 = 325 / 100 = 3.25, green.** Adding the advisor makes 330.

## What the project can score

| Stage | Weighted score | Colour |
|---|---|---|
| Today (nothing verified with customers) | 2.53 (2.15 if demand counts as 0) | yellow |
| After 10 interviews with 2–3 letters of intent | about 3.1 | green |
| After interviews, devnet with a real wallet, and an advisor | about 3.3 | green |
| Realistic ceiling before paying customers | about 3.4 | green |

A 4.0 needs several customers paying or committing money and a team with construction experience, so it is not reachable in 5 weeks. The score shows weak spots; it is not a probability of winning.

## Done since the first scorecard

- 8 more tests (15 total), including the classic SPL Token program, retention rounding, defect limits, price-change protection and release blocked by an open defect.
- Market model with sourced and assumed inputs, plus calculators on the site.
- Interview kit with scripts, evidence rules, a letter of intent and outreach messages: [INTERVIEW-KIT.md](INTERVIEW-KIT.md).
- Devnet and real-wallet steps: [DEVNET.md](DEVNET.md). Devnet is not reachable from the build sandbox, so this part remains for you.
- Full product site (problem, how it works, live simulation, calculators, comparison, plan).

## Why it can compete at Colosseum (honest view)

- Stablecoin payment rails won a prize in 9.9% of cases (20 of 202) vs 5.4% overall.
- Industry-specific B2B rails have already won (CargoBill, 1st place Stablecoins).
- Own Anchor program (3× more common among winners), not a wrapper around Solana Pay (0 of 33 winners).
- Zero analogs in the database; hook with a verified number; demo you can see.
- Weak spots a judge will notice: unproven demand, local-only demo, beginner team.

Rough target if executed well: a prize of some kind about 10–15%, a track place 3–5%, accelerator 1–2%. These are estimates, not facts.
