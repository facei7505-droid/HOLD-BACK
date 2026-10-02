# Legal side: what is known, what is not

**This is research by students, not legal advice.** Statements marked "verify" must be checked by a lawyer in the relevant country before any real money moves. Nothing here has been tested in court.

## The core question

If the client (or the subcontractor) goes bankrupt, is the retention in a Holdback vault protected, and who does it belong to?

**Short answer: unproven.** The program makes it technically impossible for the client to take the money back. Whether a court or an insolvency practitioner would treat the vault as outside the client's estate depends on the contract wording and the country. No court has ruled on a smart-contract retention vault that we know of.

## Why the design should help

- English case law treats retention as safe from the client's creditors only when it is held **on trust** for the subcontractor in a **separate, identifiable fund** (the usual authorities cited are *Re Arthur Sanders* (1981) and *Rayack Construction v Lampeter Meat* (1979); verify). A vault owned by a program with no private key is a stronger form of separation than a bank account the client controls.
- New Zealand made this mandatory: since 2017 the client must hold retention in a separate trust account (Construction Contracts Act, retention-money provisions; verify details). Holdback is a technical way to meet that rule with no bank in the middle.
- The UK government has announced plans to ban cash retention (not before 2027; verify). That shows regulators see the problem.

## What is not solved

| # | Open question | Why it matters | What to do |
|---|---|---|---|
| L1 | **Trust intent.** A trust needs the contract to say the retention is held for the subcontractor. A vault alone may not be enough | Without it, an insolvency practitioner could argue the vault is the client's asset | Draft a standard clause: "retention is held on trust for the subcontractor in the Holdback vault" (see below). Ask a lawyer to confirm |
| L2 | **Who owns the vault in law.** The client funds it, the program owns it | Courts look at substance, not code | Legal opinion in the pilot country |
| L3 | **Client's insolvency practitioner may try to call the money back** (preference or fraud rules) if retention was funded shortly before insolvency | Normal payments for work done are usually safe; large top-ups right before insolvency are not | Document that funding happens with each invoice, from the first payment |
| L4 | **Subcontractor's insolvency.** The claim belongs to the subcontractor's estate; the liquidator would need the key | A claim sale shortly before insolvency may be attacked as a transaction at an undervalue | Keep sale prices market-based and recorded on-chain |
| L5 | **Claim sale is an assignment of a receivable.** Many construction contracts forbid assignment or require notice | The on-chain transfer may not count as notice | Put assignment consent and the Holdback mechanism into the contract clause |
| L6 | **Financial regulation.** Buying claims at a discount can be factoring or lending; holding stablecoins can need a licence | Real money needs the right licence or exemption | Devnet and test tokens only until this is checked |
| L7 | **Stablecoin issuer.** USDC can be frozen by the issuer | A frozen vault cannot pay out | Disclose it; see [THREAT-MODEL.md](THREAT-MODEL.md) |
| L8 | **Evidence of a defect.** The program stores only a hash | Disputes need the underlying photos and reports | Keep the files off-chain with timestamps; arbiter reviews them |
| L9 | **Arbiter authority.** The arbiter's decision binds on-chain only. A court can still order otherwise | On-chain finality is not legal finality | Contract clause: arbiter acts as an expert, not as a court |

## Country notes (starting points, all to verify)

| Country | What we know | Implication |
|---|---|---|
| England and Wales | Retention common; about £3.2–5.9 bn held a year (see [MARKET-MODEL.md](MARKET-MODEL.md)); trust-fund case law; ban planned | Strong problem evidence; contract-clause approach (L1) matters most |
| New Zealand | Mandatory separate retention trust since 2017 | Easiest place to argue "compliance tool" |
| United States | Retainage rules differ by state (caps, interest, release deadlines) | Needs state-by-state review; start with one state |
| Kazakhstan | Retention is contractual; escrow-type arrangements and digital-asset rules exist (a 2023 digital-assets law and the AIFC regime; verify) | Pilot only with test tokens until a local lawyer reviews custody and licensing |

## Draft clause (for lawyers to improve)

> The Retention Amount shall be held by the Contractor on trust for the Subcontractor in the Holdback vault identified in Schedule 1, which neither party may withdraw from except as the Holdback program permits. The arbiter named in Schedule 1 acts as an expert, not as an arbitrator, to settle any defect claim. On expiry of the Warranty Period without an open defect the vault shall be released to the person then entitled to the retention. The Subcontractor may assign its right to the Retention Amount through the Holdback program.

## Questions to ask a construction or insolvency lawyer

1. Would this clause plus a program-owned vault be treated as a trust of the retention in our pilot country?
2. Can the client's insolvency practitioner claw the vault back, and under what conditions?
3. Is our claim sale a regulated activity (factoring, lending, securities)?
4. Do typical anti-assignment clauses block the claim sale, and how do we deal with them?
5. What licence, if any, do we need to hold or move stablecoins for customers?

## Status

None of the above is verified. This is item "L-all" in [SCORECARD.md](SCORECARD.md): it stays a known unknown until a lawyer answers the five questions.
